import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from './firebase-config.js';

function normalizeFirestoreError(error) {
  const code = error?.code || '';
  if (code === 'permission-denied' || String(error?.message || '').toLowerCase().includes('insufficient permissions')) {
    return {
      code: 'permission-denied',
      message: 'Firestore rules are blocking access. Update Firebase rules to allow authenticated users to read/write only their own users/{uid} data.'
    };
  }

  return {
    code: code || 'unknown',
    message: error?.message || 'Unknown Firestore error'
  };
}

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis && typeof value.toMillis === 'function') return value.toMillis();
  if (value?.seconds && typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

// User Profile Management
export async function createUserProfile(uid, email, name, photoURL = null) {
  try {
    const userRef = doc(db, 'users', uid);
    const existingProfile = await getDoc(userRef);
    if (existingProfile.exists()) {
      return { success: true, exists: true };
    }

    await setDoc(userRef, {
      uid,
      email,
      name,
      photoURL,
      role: 'user',
      phone: '',
      location: '',
      caseType: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        language: 'en',
        notifications: true,
        theme: 'light'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, 'users', uid);  
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function updateUserProfile(uid, updates) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export function subscribeToUserProfile(uid, callback) {
  try {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback({ success: true, data: doc.data() });
      } else {
        callback({ success: false, error: 'Profile not found' });
      }
    }, (error) => {
      callback({ success: false, error: error.message });
    });
  } catch (error) {
    console.error('Error subscribing to profile:', error);
    return null;
  }
}

// Chat History Management
export async function saveChatMessage(uid, message, role, conversationId = null) {
  try {
    const msgRef = collection(db, 'users', uid, 'conversations');
    const result = await addDoc(msgRef, {
      text: message,
      role,
      conversationId: conversationId || 'default',
      timestamp: serverTimestamp()
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving chat message:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function getChatHistory(uid, conversationId = 'default', limit = 50) {
  try {
    const q = query(
      collection(db, 'users', uid, 'conversations'),
      where('conversationId', '==', conversationId)
    );
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => getTimeValue(a.timestamp) - getTimeValue(b.timestamp));
    return { success: true, data: messages.slice(-limit) };
  } catch (error) {
    console.error('Error getting chat history:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export function subscribeToChat(uid, conversationId = 'default', callback) {
  try {
    const q = query(
      collection(db, 'users', uid, 'conversations'),
      where('conversationId', '==', conversationId)
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => getTimeValue(a.timestamp) - getTimeValue(b.timestamp));
      callback({ success: true, data: messages });
    }, (error) => {
      callback({ success: false, error: error.message });
    });
  } catch (error) {
    console.error('Error subscribing to chat:', error);
    return null;
  }
}

// Document Analysis Management
export async function saveDocumentAnalysis(uid, filename, analysis) {
  try {
    const docRef = collection(db, 'users', uid, 'documents');
    const ingestion = analysis?.ingestion || null;
    const result = await addDoc(docRef, {
      filename,
      summary: analysis.summary,
      key_points: analysis.key_points,
      parties: analysis.parties,
      dates: analysis.dates,
      risks: analysis.risks,
      next_steps: analysis.next_steps,
      ingestionMode: ingestion?.mode || null,
      ingestionConfidence: typeof ingestion?.confidence === 'number' ? ingestion.confidence : null,
      extractedChars: typeof ingestion?.extractedChars === 'number' ? ingestion.extractedChars : null,
      extractedPreview: ingestion?.preview || null,
      savedAt: serverTimestamp()
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving document analysis:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function getDocumentHistory(uid) {
  try {
    const q = collection(db, 'users', uid, 'documents');
    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => getTimeValue(b.savedAt) - getTimeValue(a.savedAt));
    return { success: true, data: documents };
  } catch (error) {
    console.error('Error getting document history:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function deleteDocument(uid, docId) {
  try {
    const docRef = doc(db, 'users', uid, 'documents', docId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

// Risk Assessment Management
export async function saveRiskAssessment(uid, answers, result) {
  try {
    const riskRef = collection(db, 'users', uid, 'risk_assessments');
    const assessResult = await addDoc(riskRef, {
      answers,
      risk_level: result.risk_level,
      risk_score: result.risk_score,
      reason: result.reason,
      urgent_actions: result.urgent_actions,
      long_term_advice: result.long_term_advice,
      assessedAt: serverTimestamp()
    });
    return { success: true, id: assessResult.id };
  } catch (error) {
    console.error('Error saving risk assessment:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function saveComplaintDraft(uid, draft) {
  try {
    const complaintRef = collection(db, 'users', uid, 'complaints');
    const result = await addDoc(complaintRef, {
      complaintType: draft.complaintType,
      subject: draft.subject,
      incident: draft.incident,
      parties: draft.parties || [],
      dates: draft.dates || [],
      location: draft.location || '',
      evidence: draft.evidence || '',
      requestedRelief: draft.requestedRelief || '',
      draftText: draft.draftText,
      generatedAt: serverTimestamp()
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving complaint draft:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

// Scheme activity management
export async function saveSchemeActivity(uid, activity) {
  try {
    const schemeRef = collection(db, 'users', uid, 'scheme_activity');
    const result = await addDoc(schemeRef, {
      schemeId: activity.schemeId,
      schemeName: activity.schemeName,
      action: activity.action,
      state: activity.state || '',
      portalUrl: activity.portalUrl || '',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving scheme activity:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function getSchemeActivity(uid) {
  try {
    const schemeRef = collection(db, 'users', uid, 'scheme_activity');
    const snapshot = await getDocs(schemeRef);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      type: 'scheme',
      ...doc.data()
    })).sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
    return { success: true, data: activities };
  } catch (error) {
    console.error('Error getting scheme activity:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

export async function getRiskAssessmentHistory(uid) {
  try {
    const q = collection(db, 'users', uid, 'risk_assessments');
    const snapshot = await getDocs(q);
    const assessments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => getTimeValue(b.assessedAt) - getTimeValue(a.assessedAt));
    return { success: true, data: assessments };
  } catch (error) {
    console.error('Error getting risk assessment history:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}

// Query History Management (Combined across all types)
export async function getQueryHistory(uid, type = 'all') {
  try {
    let allHistory = [];
    
    if (type === 'chat' || type === 'all') {
      const chatRef = collection(db, 'users', uid, 'conversations');
      const chatSnap = await getDocs(chatRef);
      const chats = chatSnap.docs.map(doc => ({
        id: doc.id,
        type: 'chat',
        ...doc.data()
      }));
      allHistory.push(...chats);
    }
    
    if (type === 'document' || type === 'all') {
      const docRef = collection(db, 'users', uid, 'documents');
      const docSnap = await getDocs(docRef);
      const docs = docSnap.docs.map(doc => ({
        id: doc.id,
        type: 'document',
        ...doc.data()
      }));
      allHistory.push(...docs);
    }
    
    if (type === 'risk' || type === 'all') {
      const riskRef = collection(db, 'users', uid, 'risk_assessments');
      const riskSnap = await getDocs(riskRef);
      const risks = riskSnap.docs.map(doc => ({
        id: doc.id,
        type: 'risk',
        ...doc.data()
      }));
      allHistory.push(...risks);
    }

    if (type === 'complaint' || type === 'all') {
      const complaintRef = collection(db, 'users', uid, 'complaints');
      const complaintSnap = await getDocs(complaintRef);
      const complaints = complaintSnap.docs.map(doc => ({
        id: doc.id,
        type: 'complaint',
        ...doc.data()
      }));
      allHistory.push(...complaints);
    }

    if (type === 'scheme' || type === 'all') {
      const schemeRef = collection(db, 'users', uid, 'scheme_activity');
      const schemeSnap = await getDocs(schemeRef);
      const schemes = schemeSnap.docs.map(doc => ({
        id: doc.id,
        type: 'scheme',
        ...doc.data()
      }));
      allHistory.push(...schemes);
    }
    
    // Sort by timestamp
    allHistory.sort((a, b) => {
      const timeA = getTimeValue(a.timestamp || a.savedAt || a.assessedAt || a.generatedAt || a.createdAt);
      const timeB = getTimeValue(b.timestamp || b.savedAt || b.assessedAt || b.generatedAt || b.createdAt);
      return timeB - timeA;
    });
    
    return { success: true, data: allHistory };
  } catch (error) {
    console.error('Error getting query history:', error);
    const normalized = normalizeFirestoreError(error);
    return { success: false, error: normalized.message, code: normalized.code };
  }
}
