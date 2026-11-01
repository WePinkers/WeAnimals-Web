import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot,
  query 
} from 'firebase/firestore'
import { db } from '../../firebase'
import type { Report, AnimalItem } from '../types'

export function subscribeToReports(callback: (reports: Report[]) => void) {
  const q = query(collection(db, 'reports'))
  return onSnapshot(q, (snapshot) => {
    const reportsList = snapshot.docs.map((document) => ({
      id: Number(document.id) || document.data().id,
      ...document.data(),
    })) as Report[]
    callback(reportsList)
  })
}

export async function updateReportStatusInFirestore(reportId: number, newStatus: string) {
  try {
    const reportDocRef = doc(db, 'reports', String(reportId))
    await updateDoc(reportDocRef, {
      status: newStatus,
      elapsed: 'atualizado agora'
    })
  } catch (error) {
    console.error('Erro ao atualizar denúncia no Firestore:', error)
  }
}

export async function addAnimalToFirestore(newAnimal: Omit<AnimalItem, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'animals'), newAnimal)
    return docRef.id
  } catch (error) {
    console.error('Erro ao adicionar animal no Firestore:', error)
    throw error
  }
}
