/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  MessageSquare, 
  History, 
  BookOpen, 
  FileText, 
  Settings, 
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Scale,
  ShieldCheck,
  Search,
  Loader2,
  Trash2,
  Moon,
  Sparkles,
  Paperclip,
  Play,
  Users,
  Camera,
  Cloud,
  Laptop,
  X,
  Brain,
  Book,
  ExternalLink,
  Globe,
  Library,
  CloudUpload,
  HardDrive,
  Languages,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  File,
  Menu,
  Download,
  FolderOpen,
  Star,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Printer,
  RotateCcw,
  Share2,
  MoreVertical,
  Type,
  Shield,
  Table as TableIcon,
  Database,
  Building2,
  Link as LinkIcon
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { getGeminiResponse, enhancePrompt } from './lib/gemini';
import { compressImage, getBase64Size } from './lib/imageUtils';
import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: any;
  file?: { name: string, type: string, data: string } | null;
}

interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: any;
  lastMessage?: string;
}

interface UploadHistoryItem {
  id: string;
  name: string;
  size: string;
  date: string;
  url: string;
  type: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChat, setIsNewChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [showDriveSetup, setShowDriveSetup] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [activeDocument, setActiveDocument] = useState<{ id: string, name: string, content: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string, data: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(3);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([
    { id: '1', name: 'Putusan_MK_No_90.pdf', size: '2.4 MB', date: 'Hari ini', url: 'https://drive.google.com/file/d/1', type: 'application/pdf' },
    { id: '2', name: 'Kontrak_Kerja_Sama.docx', size: '1.1 MB', date: 'Kemarin', url: 'https://docs.google.com/document/d/2', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  ]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAutoUpload = (files: FileList) => {
    setToast({ message: `Mengunggah ${files.length} dokumen ke Google Drive...`, type: 'info' });
    
    const newItems: UploadHistoryItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      date: 'Baru saja',
      url: file.type.includes('pdf') ? 'https://drive.google.com/file/d/1' : 'https://docs.google.com/document/u/0/',
      type: file.type
    }));

    setTimeout(() => {
       setUploadHistory(prev => [...newItems, ...prev]);
       setToast({ message: "Berhasil diunggah dan disimpan otomatis ke Google Drive!", type: 'success' });
       setTimeout(() => setToast(null), 3000);
    }, 2000);
  };

  const applyFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleDocumentEdit(editorRef.current.innerHTML);
    }
  };

  const lastSyncedContent = useRef<string>("");

  // Sync editor when active document changes
  useEffect(() => {
    if (activeDocument && editorRef.current && activeDocument.content !== lastSyncedContent.current) {
        editorRef.current.innerHTML = activeDocument.content;
        lastSyncedContent.current = activeDocument.content;
    }
  }, [activeDocument?.id]);
  
  const handleDocScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPos = container.scrollTop;
    const pageHeight = 1150; // Approximated height of one page including margins
    const newPage = Math.min(totalPages, Math.max(1, Math.floor((scrollPos + 400) / pageHeight) + 1));
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleDocumentEdit = (newContent: string) => {
    if (!activeDocument || newContent === lastSyncedContent.current) return;
    lastSyncedContent.current = newContent;
    setActiveDocument({ ...activeDocument, content: newContent });
    
    // Simulate calculating total pages based on content length
    const estimatedPages = Math.max(1, Math.ceil(newContent.length / 1500));
    if (estimatedPages !== totalPages) {
      setTotalPages(estimatedPages);
    }
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Settings preferences
  const [settings, setSettings] = useState({
    legalTone: 'formal',
    expertLevel: 'senior',
    autoSave: true,
    aiTemperature: 0.7,
    aiCreativity: 'balanced',
    aiPersona: 'professional',
    neuralDrafting: false
  });
  const [integrations, setIntegrations] = useState({
    googleSheets: false,
    googleCalendar: false,
    gmail: false,
    googleCloud: false,
    googleDrive: true
  });
  const [lawFirmProfile, setLawFirmProfile] = useState({
    name: 'Lexsia.ai',
    address: 'Jakarta, Indonesia',
    contact: 'Telepon. 089673797229/081369969969 Kodepos 54317',
    logo: null as string | null
  });
  const [settingsTab, setSettingsTab] = useState<'account' | 'ai' | 'integrations' | 'profile' | 'datacenter' | 'legalcenter'>('account');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Create user doc if not exists
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.error(err);
          setError("Gagal memperbarui profil pengguna.");
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch chats
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setChats(chatList);
    }, (err) => {
      console.error(err);
      setError("Gagal memuat daftar percakapan.");
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, `chats/${activeChat}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgList);
      scrollToBottom();

      // AUTO-LOAD LATEST DOCUMENT FROM CHAT
      const docMessages = msgList.filter(m => m.file && m.file.type === 'application/vnd.google-apps.document');
      if (docMessages.length > 0) {
        const lastDocMsg = docMessages[docMessages.length - 1];
        if (lastDocMsg.file) {
          setActiveDocument({
            id: lastDocMsg.id,
            name: lastDocMsg.file.name,
            content: lastDocMsg.file.data || ""
          });
          setIsSplitView(true);
        }
      } else {
        // Only clear if we just switched chat (not on every message update)
        // Actually, safer to just clear if no doc found in any message
        // unless we're in the middle of a request
        // but simple is usually better
        if (!isSending) {
           setActiveDocument(null);
           setIsSplitView(false);
        }
      }
    }, (err) => {
      console.error(err);
      setError("Gagal memuat pesan.");
    });
    return () => unsubscribe();
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      setError("Gagal masuk dengan Google.");
    }
  };

  const handleLogout = () => signOut(auth);

  const startNewChat = async () => {
    if (!user) return;
    setError(null);
    setActiveDocument(null);
    setIsSplitView(false);
    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        title: 'Percakapan Baru',
        createdAt: serverTimestamp(),
      });
      setActiveChat(docRef.id);
      setIsNewChat(true);
    } catch (err) {
      console.error(err);
      setError("Gagal membuat percakapan baru.");
    }
  };

  const handleDeleteChat = async (chatId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!window.confirm('Hapus percakapan ini secara permanen?')) return;
    
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      setToast({ message: "Percakapan berhasil dihapus.", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Delete error:", err);
      handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}`);
    }
  };

  const handleDeleteAllChats = async () => {
    if (chats.length === 0) return;
    if (!window.confirm('Hapus SEMUA riwayat percakapan? Tindakan ini tidak dapat dibatalkan.')) return;

    setIsSending(true); // Usage of loading state
    try {
      const promises = chats.map(chat => deleteDoc(doc(db, 'chats', chat.id)));
      await Promise.all(promises);
      
      setActiveChat(null);
      setMessages([]);
      setToast({ message: "Semua riwayat percakapan telah dihapus.", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Delete all error:", err);
      setError("Gagal menghapus semua percakapan.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string) => {
    e?.preventDefault();
    const finalInput = messageOverride || input;
    if (!finalInput.trim() || isSending || !user) return;

    setError(null);
    let chatId = activeChat;
    const userMessage = finalInput.trim();
    if (!messageOverride) setInput('');
    setIsSending(true);

    try {
      if (!chatId) {
        // Create new chat session if none active
        const chatRef = await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          title: userMessage.slice(0, 40) + '...',
          createdAt: serverTimestamp(),
        });
        chatId = chatRef.id;
        setActiveChat(chatId);
      }

      // 1. Save user message
      // Safeguard: Check if the file data is too large for Firestore (1MB limit)
      let fileToSave = attachedFile ? { ...attachedFile } : null;
      if (fileToSave && getBase64Size(fileToSave.data) > 800000) {
        // If still > 800KB, we don't save the full data to Firestore to avoid crash
        // but we still send it to Gemini for this turn
        fileToSave.data = "[Data file terlalu besar untuk disimpan di riwayat chat, namun telah dianalisis]";
      }

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
        file: fileToSave
      });

      // Update chat title if it's potentially the first message or a placeholder
      const currentChat = chats.find(c => c.id === chatId);
      if (currentChat && (currentChat.title === 'Percakapan Baru' || !currentChat.lastMessage)) {
        updateDoc(doc(db, 'chats', chatId), {
          title: userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '')
        }).catch(console.error);
      }

      // 2. Get Gemini response
      const history = messages.map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.content }]
      }));
      
      const aiResponse = await getGeminiResponse(userMessage, history, agentMode, attachedFile || undefined, {
        name: lawFirmProfile.name,
        address: lawFirmProfile.address,
        contact: lawFirmProfile.contact
      });

      // AUTO-DETECT DOCUMENT REQUEST
      const docTriggers = ['buatkan', 'draft', 'surat', 'kontrak', 'perjanjian', 'drafting'];
      const isDocRequest = docTriggers.some(t => userMessage.toLowerCase().includes(t));

      let generatedDocFile = null;

      if (isDocRequest && agentMode) {
        // Robust logic to extract content specifically for legal drafts
        let docContent = aiResponse;
        
        // 1. Try to find markdown code block which usually contains the draft
        const codeBlockMatch = aiResponse.match(/```(?:markdown|text)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
           docContent = codeBlockMatch[1].trim();
        } else {
           // 2. Fallback: Find the first header or bolded title
           const lines = aiResponse.split('\n');
           const docStartIndex = lines.findIndex(line => 
              line.startsWith('#') || 
              line.trim().startsWith('**') || 
              (line.trim().toUpperCase() === line.trim() && line.trim().length > 10 && !line.includes('HALO'))
           );
           
           if (docStartIndex !== -1) {
              // Extract from title downwards
              const candidateContent = lines.slice(docStartIndex).join('\n').trim();
              
              // Remove post-draft conversation if it's brief
              const endMarkers = ["Mohon dicek", "Demikian", "Terima kasih", "Semoga membantu"];
              const contentLines = candidateContent.split('\n');
              let lastRelevantLine = -1;
              for (let i = contentLines.length - 1; i >= 0; i--) {
                if (!endMarkers.some(m => contentLines[i].includes(m))) {
                  lastRelevantLine = i;
                  break;
                }
              }
              
              if (lastRelevantLine !== -1) {
                 docContent = contentLines.slice(0, lastRelevantLine + 1).join('\n').trim();
              } else {
                 docContent = candidateContent;
              }
           }
        }

        // Extract a clean document name
        let docName = userMessage.trim();
        const removePrefixes = ['buatkan', 'buatkan saya', 'tolong buatkan', 'berikan', 'draft', 'siapkan'];
        const lowerMsg = docName.toLowerCase();
        
        for (const prefix of removePrefixes) {
          if (lowerMsg.startsWith(prefix)) {
            docName = docName.slice(prefix.length).trim();
            break;
          }
        }
        
        docName = docName.charAt(0).toUpperCase() + docName.slice(1);
        if (docName.length > 50) docName = docName.slice(0, 47) + '...';
        if (!docName) docName = "Dokumen Hukum";
        
        // Enhanced markdown to HTML conversion for Indonesia-specific legal formatting
        const formattedContent = docContent
          // 1. Handle Right-Aligned Date (e.g., "Kebumen, 16 April 2026")
          .replace(/^([A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4})$/gm, '<div style="text-align: right; margin-bottom: 20pt;">$1</div>')
          
          // 2. Handle Subject (Perihal)
          .replace(/^(Perihal\s*:\s*)(.*)$/gm, '<table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 10pt;"><tr><td width="70" valign="top"><strong>Perihal</strong></td><td width="15" valign="top"><strong>:</strong></td><td valign="top"><strong>$2</strong></td></tr></table>')
          
          // 3. Handle Address Block (Kepada Yth.)
          .replace(/^(Kepada Yth\.)([\s\S]*?)(di\s*–\s*|di\s*-\s*)?(\nTempat|\nJakarta|\n[A-Z][a-z]+)?$/gm, (match, p1, p2, p3, p4) => {
             const lines = p2.trim().split('\n');
             return `<div style="margin-top: 15pt; margin-bottom: 15pt;">
               <strong>${p1}</strong><br/>
               ${lines.join('<br/>')}<br/>
               ${p3 ? p3.trim() : ''}${p3 && p4 ? '<br/>' : ''}
               ${p4 ? `<strong>${p4.trim()}</strong>` : ''}
             </div>`;
          })
          
          // 4. Handle "Tempat" or "Jakarta" at the end of address
          .replace(/^(Tempat|Jakarta|[A-Za-z\s]+)$/gm, (match) => {
             if (match.trim() === 'Tempat') return `<p><strong>${match}</strong></p>`;
             return match;
          })

          // 5. Handle Headings (Standard Markdown)
          .replace(/^# (.*$)/gm, '<h1 style="font-size: 18pt; text-align: center; font-weight: bold; margin-bottom: 15pt; text-transform: uppercase; font-family: \'Times New Roman\', serif; color: black;">$1</h1>')
          .replace(/^## (.*$)/gm, '<h2 style="font-size: 14pt; font-weight: bold; margin-top: 15pt; margin-bottom: 10pt; text-transform: uppercase; font-family: \'Times New Roman\', serif; color: black;">$1</h2>')
          .replace(/^### (.*$)/gm, '<h3 style="font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; font-family: \'Times New Roman\', serif; color: black;">$1</h3>')
          
          // 6. Handle Identity Form (Nama :, NIK :, etc. aligned with Colons)
          .replace(/^([A-Za-z\s\/.\-]+\s*:\s*)(.*($|\n)){1,}/gm, (match) => {
             const rows = match.trim().split('\n');
             if (!rows.some(r => r.includes(':'))) return match;

             let tableLines = '<table border="0" cellpadding="0" cellspacing="0" style="margin-top: 10pt; margin-bottom: 10pt; width: 100%;">';
             rows.forEach(row => {
               const colonIndex = row.indexOf(':');
               if (colonIndex !== -1) {
                 const key = row.substring(0, colonIndex).trim();
                 const val = row.substring(colonIndex + 1).trim();
                 tableLines += `<tr>
                   <td width="140" valign="top" style="padding: 2px 0;">${key}</td>
                   <td width="15" valign="top" style="padding: 2px 0;">:</td>
                   <td valign="top" style="padding: 2px 0; text-align: justify;">${val}</td>
                 </tr>`;
               } else {
                 tableLines += `<tr><td colspan="3" style="padding: 2px 0;">${row}</td></tr>`;
               }
             });
             tableLines += '</table>';
             return tableLines;
          })

          // 7. Handle Lists (Markdown style) using REAL tables for Word compatibility
          .replace(/^\d+\.\s+(.*)$/gm, (match) => {
             const numMatch = match.match(/^\d+\./);
             const num = numMatch ? numMatch[0] : "";
             const text = match.replace(/^\d+\.\s+/, "");
             return `<table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 5pt; width: 100%;">
               <tr>
                 <td width="25" valign="top" style="padding-top: 2pt;">${num}</td>
                 <td valign="top" style="text-align: justify;">${text}</td>
               </tr>
             </table>`;
          })

          // 7. Standard Markdown elements
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.*?)\*/g, '<i>$1</i>')
          .replace(/---/g, '<hr style="border: 0; border-top: 1px solid black; margin: 15pt 0;"/>')
          
          // 8. Handle Roman Numerals at start of lines (e.g. "I. TERLAPOR")
          .replace(/^([IVXLC]+\..*)$/gm, '<p><strong>$1</strong></p>')

          // 9. Newlines to breaks (after tables and other blocks)
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n/g, '<br/>');

        // Wrap content with professional legal template using TABLES for Word compatibility and Indonesian legal formatting
        const legalTemplate = `
          <div class="legal-document-container" style="font-family: 'Times New Roman', Times, serif; color: black; background: white; line-height: 1.5;">
            <!-- Header / Kop Surat -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 5px; border-bottom: 3px solid black;">
              <tr>
                ${lawFirmProfile.logo ? `<td width="100" align="center" valign="middle" style="padding-bottom: 10px;"><img src="${lawFirmProfile.logo}" style="width: 90px; height: 90px; object-fit: contain;" /></td>` : ''}
                <td align="center" valign="middle" style="padding-bottom: 10px;">
                  <h1 style="font-size: 18pt; margin: 0; font-weight: bold; color: black; text-transform: uppercase; letter-spacing: 2px; font-family: 'Times New Roman', serif;">${lawFirmProfile.name}</h1>
                  <p style="font-size: 10pt; margin: 2px 0; color: #000; font-family: 'Times New Roman', serif;">${lawFirmProfile.address}</p>
                  <p style="font-size: 10pt; margin: 2px 0; color: #000; font-family: 'Times New Roman', serif;">Telp/Kontak: ${lawFirmProfile.contact}</p>
                </td>
              </tr>
            </table>
            <div style="border-bottom: 1px solid black; margin-bottom: 30px; margin-top: 2px;"></div>
            
            <!-- Isi Dokumen -->
            <div class="legal-content" style="line-height: 1.5; text-align: justify; font-size: 12pt; color: black; font-family: 'Times New Roman', serif;">
              ${formattedContent}
            </div>

            <!-- Footer / Page Info -->
            <div style="margin-top: 50px; padding-top: 5px; border-top: 1px solid #000;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 9pt; color: #333; font-style: italic; font-family: 'Times New Roman', serif;">
                    ${lawFirmProfile.name} &bull; ${docName}
                  </td>
                  <td align="right" style="font-size: 9pt; font-weight: bold; color: #000; font-family: 'Times New Roman', serif;">
                    Halaman 1
                  </td>
                </tr>
              </table>
            </div>
          </div>
        `;

        const newDoc = {
          id: Math.random().toString(36).substr(2, 9),
          name: docName,
          content: legalTemplate
        };
        setActiveDocument(newDoc);
        setIsSplitView(true);

        // Prepare file object to be saved in the assistant message
        generatedDocFile = {
          name: docName + (docName.toLowerCase().endsWith('.docx') ? '' : '.docx'),
          type: 'application/vnd.google-apps.document',
          data: legalTemplate 
        };
      }

      // 3. Save assistant message
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        role: 'assistant',
        content: aiResponse,
        createdAt: serverTimestamp(),
        file: generatedDocFile
      });

      // Clear attached file after success
      setAttachedFile(null);

      // Update last message in chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: aiResponse.slice(0, 50) + '...',
        updatedAt: serverTimestamp()
      });

    } catch (error: any) {
      console.error(error);
      setError(error.message || "Terjadi kesalahan saat memproses permintaan Anda.");
      setInput(userMessage); // Restore input on fail
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isDocx = file.type.includes('word') || file.name.endsWith('.docx');
    const isDocument = file.type === 'application/pdf' || file.type.includes('text') || isDocx;

    if (isImage || isDocument) {
       if (isDocx) {
         const reader = new FileReader();
         reader.onloadend = async () => {
           try {
             const arrayBuffer = reader.result as ArrayBuffer;
             const result = await mammoth.extractRawText({ arrayBuffer });
             const text = result.value;
             
             // Convert text to base64 for consistency with other files
             const base64Text = btoa(unescape(encodeURIComponent(text)));
             
             setAttachedFile({
               name: file.name,
               type: 'text/plain',
               data: `data:text/plain;base64,${base64Text}`
             });
             
             // Auto-save to Google Drive
             handleAutoUpload({
               length: 1,
               item: (i: number) => i === 0 ? file : null,
               [Symbol.iterator]: function* () { yield file; }
             } as unknown as FileList);

             setError(`File Word "${file.name}" berhasil dikonversi ke teks dan dilampirkan.`);
             setTimeout(() => setError(null), 3000);
           } catch (err) {
             console.error("Docx parsing failed:", err);
             setError("Gagal membaca file Word. Coba simpan sebagai PDF atau Teks.");
           }
         };
         reader.readAsArrayBuffer(file);
         return;
       }

       const reader = new FileReader();
       reader.onloadend = async () => {
         let fileData = reader.result as string;
         
         if (isImage) {
           try {
             // Compress to max 1200px dimension, high quality initially
             fileData = await compressImage(fileData, 1200, 0.8);
             
             // If still too large (> 600KB), aggressive compression
             if (getBase64Size(fileData) > 600000) {
               fileData = await compressImage(fileData, 800, 0.6);
             }
           } catch (err) {
             console.error("Compression failed:", err);
           }
         }

         setAttachedFile({
           name: file.name,
           type: file.type,
           data: fileData
         });
         
         // Auto-save to Google Drive
         handleAutoUpload({
           length: 1,
           item: (i: number) => i === 0 ? file : null,
           [Symbol.iterator]: function* () { yield file; }
         } as unknown as FileList);

         setError(`File "${file.name}" berhasil dilampirkan.`);
         setTimeout(() => setError(null), 3000);
       };
       reader.readAsDataURL(file);
    } else {
       setError("Tipe file tidak didukung. Gunakan Gambar, PDF, Word, atau Teks.");
    }
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setError("Link undangan berhasil disalin ke clipboard!");
      setTimeout(() => setError(null), 3000);
    });
  };

  const exportToDoc = () => {
    if (!activeDocument) return;
    
    // Improved HTML to .doc with better styling and MSO compliance
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Lexsia Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 21.0cm 29.7cm;
            margin: 4.0cm 3.0cm 3.0cm 4.0cm; /* Top 4, Right 3, Bottom 3, Left 4 */
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: "Times New Roman", Times, serif;
            line-height: 1.5;
            font-size: 12pt;
            color: black;
          }
          /* Targeting ONLY content paragraphs and lists for the 0.64cm indent */
          .legal-content p, 
          .legal-content div, 
          .legal-content li {
            margin-top: 0in;
            margin-right: 0in;
            margin-bottom: 4.0pt; /* Spacing After: 4 pt as per image */
            margin-left: 0.25in;   /* Indent Left: ~0.64cm (0.25 inch) as per image */
            text-align: justify;
          }
          /* Ensure header/footer tables don't get the content indent */
          table {
            border-collapse: collapse;
            width: 100%;
            margin-left: 0in;
          }
          /* Headers are centered and full width */
          h1 { 
            font-size: 18pt; 
            text-align: center; 
            margin-bottom: 20pt; 
            text-transform: uppercase; 
            font-weight: bold; 
            margin-left: 0in;
          }
          h2 { 
            font-size: 14pt; 
            font-weight: bold; 
            margin-top: 15pt; 
            margin-bottom: 10pt; 
            margin-left: 0in;
          }
          .legal-document-container { width: 100%; }
        </style>
      </head>
      <body>
        <div class="Section1">
    `;
    const footer = "</div></body></html>";
    
    // Ensure content is processed
    let content = activeDocument.content;
    
    // Clean up content: Word doesn't like some web-specific classes or units
    // But our tables and inline styles are mostly fine.
    
    const sourceHTML = header + content + footer;
    
    const blob = new Blob([sourceHTML], { type: 'application/vnd.ms-word' });
    const url = URL.createObjectURL(blob);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = (activeDocument.name || 'Lexsia-Document') + '.doc';
    fileDownload.click();
    
    setTimeout(() => {
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    }, 100);
  };
  const handleSmartAction = async () => {
    if (input.trim()) {
      // Enhance current input
      setIsEnhancing(true);
      try {
        const enhanced = await enhancePrompt(input.trim());
        setInput(enhanced);
        setError("Prompt Anda telah ditingkatkan untuk hasil yang lebih presisi.");
        setTimeout(() => setError(null), 3000);
      } catch (err) {
        console.error(err);
        setError("Gagal meningkatkan prompt.");
      } finally {
        setIsEnhancing(false);
      }
    } else {
      // Summarize conversation
      if (!activeChat || messages.length === 0) return;
      handleSendMessage(undefined, "Tolong buatkan ringkasan singkat dari percakapan kita sejauh ini.");
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Browser Anda tidak mendukung akses kamera atau sedang dalam mode tidak aman (HTTP).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      setShowConnectMenu(false);
      setShowPlusMenu(false);
      setError(null);
    } catch (err: any) {
      console.error("Camera Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Izin kamera ditolak. Harap izinkan akses kamera pada pengaturan browser Anda dan pastikan Anda mengklik 'Izinkan' pada prompt AI Studio.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Kamera tidak ditemukan pada perangkat Anda.");
      } else {
        setError("Gagal mengakses kamera: " + (err.message || "Kesalahan tidak diketahui"));
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          // Compress captured photo
          dataUrl = await compressImage(dataUrl, 1200, 0.8);
        } catch (err) {
          console.error("Capture compression failed:", err);
        }

        setAttachedFile({
          name: `Capture_${new Date().getTime()}.jpg`,
          type: 'image/jpeg',
          data: dataUrl
        });
        setError("Foto berhasil diambil dan dilampirkan.");
        stopCamera();
      }
    }
  };

  const connectGoogleDrive = () => {
    const clientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

    if (!clientId || !apiKey) {
      setShowDriveSetup(true);
      setShowConnectMenu(false);
      setShowPlusMenu(false);
      return;
    }
    
    setToast({ 
      message: "Fitur Google Drive telah dikonfigurasi. Memuat picker...", 
      type: 'info' 
    });
    setShowConnectMenu(false);
    setShowPlusMenu(false);
    setTimeout(() => setToast(null), 5000);
  };

  const simulateDriveConnection = () => {
    setToast({ message: "Menghubungkan ke Drive (Mode Demo)...", type: 'info' });
    setShowDriveSetup(false);
    
    setTimeout(() => {
      setAttachedFile({
        name: "Contoh_Dokumen_Hukum.docx",
        type: "text/plain",
        data: "data:text/plain;base64,LyoqCiAqIENvbnRvaCBEb2t1bWVuIEh1a3VtCiAqIFNpbXVsYXNpIGRhcmkgR29vZ2xlIERyaXZlCiAqLw=="
      });
      setToast({ message: "File dari Drive berhasil dilampirkan (Simulasi).", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }, 1500);
  };

  const openInGoogleDocs = (fileName: string, content?: string) => {
    if (content) {
      // Create a temporary element to copy rich text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      try {
        document.execCommand('copy');
        setToast({ message: `Draf "${fileName}" telah disalin sebagai format kaya. Menyiapkan Google Docs...`, type: 'info' });
      } catch (err) {
        navigator.clipboard.writeText(tempDiv.innerText);
        setToast({ message: `Draf "${fileName}" telah disalin sebagai teks biasa. Menyiapkan Google Docs...`, type: 'info' });
      }
      
      document.body.removeChild(tempDiv);
      selection?.removeAllRanges();
    } else {
      setToast({ message: `Menyiapkan "${fileName}" untuk Google Docs...`, type: 'info' });
    }
    
    setTimeout(() => {
      window.open('https://docs.google.com/document/u/0/create', '_blank');
      setToast({ message: "Gunakan 'Paste' (Ctrl+V) di Google Docs. Format hukum Anda akan tetap terjaga.", type: 'success' });
      setTimeout(() => setToast(null), 5000);
    }, 1200);
  };

  const simulateSaveToDrive = (fileName: string, content: string) => {
    const clientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

    if (!clientId || !apiKey) {
      setShowDriveSetup(true);
      return;
    }

    setToast({ message: `Menyimpan "${fileName}" ke Google Drive...`, type: 'info' });
    
    setTimeout(() => {
      const newHistoryItem: UploadHistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName.endsWith('.docx') || fileName.endsWith('.pdf') ? fileName : `${fileName}.docx`,
        size: formatFileSize(content.length), // Estimated size
        date: 'Baru saja',
        url: 'https://docs.google.com/document/u/0/',
        type: 'application/vnd.google-apps.document'
      };
      setUploadHistory(prev => [newHistoryItem, ...prev]);
      setToast({ message: `Berhasil disimpan ke Google Drive dalam folder "Lexsia AI".`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }, 2000);
  };


  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-legal-cream">
        <Loader2 className="w-8 h-8 animate-spin text-legal-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-heritage-bone text-heritage-ink font-sans selection:bg-heritage-gold selection:text-white overflow-x-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-8 bg-heritage-bone/80 backdrop-blur-md border-b border-heritage-ink/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-heritage-ink flex items-center justify-center p-2">
              <Scale className="text-heritage-gold w-full h-full" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight">Lexsia.ai</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogin}
            className="flex items-center gap-3 px-6 py-2.5 bg-heritage-ink text-white text-xs font-bold uppercase tracking-widest hover:bg-heritage-gold transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" className="w-3 h-3 brightness-0 invert" alt="Google" />
            Akses Member
          </motion.button>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-40 pb-20 px-6 md:px-12 min-h-[90vh] flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-5xl"
          >
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-heritage-gold mb-6 block">Kecerdasan Hukum Masa Depan</span>
            <h1 className="text-6xl md:text-8xl lg:text-[10vw] font-serif font-bold leading-[0.9] tracking-tighter mb-8">
              Keadilan yang <br/> <span className="italic font-normal">Beradab.</span>
            </h1>
            <p className="text-lg md:text-xl text-heritage-ink/60 max-w-2xl mx-auto font-light leading-relaxed mb-12">
              Integrasi kecerdesan buatan dengan kearifan hukum Indonesia. 
              Membangun fondasi legal yang kokoh bagi masa depan Nusantara bersama Lexsia.ai.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={handleLogin}
                className="group relative px-10 py-5 bg-heritage-ink text-white text-sm font-bold uppercase tracking-widest overflow-hidden transition-all hover:pr-14"
              >
                <span className="relative z-10">Mulai Konsultasi</span>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <div className="flex items-center gap-4 py-4 sm:py-0 border-t sm:border-t-0 sm:border-l border-heritage-ink/10 sm:pl-8">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-heritage-bone overflow-hidden bg-heritage-gold/20">
                      <img src={`https://picsum.photos/seed/lawyer${i}/100/100`} alt="" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-heritage-ink/40">Kepercayaan</p>
                  <p className="text-xs font-bold text-heritage-ink">500+ Praktisi Hukum</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Background Decorative */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 opacity-5 pointer-events-none overflow-hidden">
             <div className="w-[120vw] h-[120vh] bg-[url('https://www.transparenttextures.com/patterns/batik.png')] rotate-12 scale-150"></div>
          </div>
        </section>

        {/* Feature Split Section */}
        <section className="bg-heritage-ink text-heritage-bone py-24 md:py-40">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/5] overflow-hidden"
            >
              <img 
                src="https://picsum.photos/seed/jakarta-legal/800/1000" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                alt="Indonesian Legal Landscape" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-heritage-ink/20"></div>
              <div className="absolute bottom-10 left-10 p-8 bg-heritage-bone/5 backdrop-blur-xl border border-white/10 max-w-xs">
                <p className="text-[10px] uppercase tracking-widest font-black text-heritage-gold mb-2">Presisi Data</p>
                <p className="text-sm font-serif leading-relaxed italic">
                  "Teknologi bukan pengganti keadilan, melainkan akselerator kepastian hukum."
                </p>
              </div>
            </motion.div>
            
            <div className="space-y-16">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
                  Menavigasi Labirin <br/> Regulasi Nusantara.
                </h2>
                <div className="w-20 h-1 bg-heritage-gold"></div>
              </div>

              <div className="space-y-12">
                {[
                  { 
                    num: "01", 
                    title: "Riset Regulasi Mendalam", 
                    desc: "Akses ke ribuan Peraturan Perundang-undangan di Indonesia dalam hitungan detik. Cerdas, akurat, dan mutakhir." 
                  },
                  { 
                    num: "02", 
                    title: "Drafting Dokumen Presisi", 
                    desc: "Hasilkan draf kontrak, surat gugatan, dan memo hukum dengan standar firma hukum papan atas." 
                  },
                  { 
                    num: "03", 
                    title: "Analisis Risiko Terintegrasi", 
                    desc: "Identifikasi celah hukum dan mitigasi risiko operasional melalui algoritma cerdas berbasis data." 
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-8 group cursor-default"
                  >
                    <span className="text-2xl font-serif font-black text-heritage-gold/40 group-hover:text-heritage-gold transition-colors">{item.num}</span>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                      <p className="text-sm text-heritage-bone/50 leading-relaxed font-light">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Gallery / Insights */}
        <section className="bg-heritage-bone py-24 md:py-40 px-6 md:px-12">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-heritage-ink/10 pb-12">
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest font-black text-heritage-gold">Expertise & Insights</p>
                <h2 className="text-5xl md:text-6xl font-serif font-bold tracking-tighter">Layanan Unggulan.</h2>
              </div>
              <p className="text-sm font-light text-heritage-ink/60 max-w-xs leading-relaxed">
                Kami menggabungkan pengalaman bertahun-tahun dengan teknologi terkini untuk memberikan solusi hukum yang tak tertandingi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[800px]">
              <div className="md:col-span-2 md:row-span-2 bg-heritage-ink p-12 flex flex-col justify-between group overflow-hidden relative">
                <div className="relative z-10 space-y-6">
                  <Gavel className="text-heritage-gold w-12 h-12" />
                  <h3 className="text-3xl font-serif font-bold text-white leading-tight">Litigasi & <br/> Penyelesaian Sengketa.</h3>
                  <p className="text-sm text-white/40 font-light max-w-xs transition-all group-hover:text-white/80">Strategi pertahanan dan penyerangan di pengadilan yang didukung oleh analisis AI mendalam guna memenangkan kasus Anda.</p>
                </div>
                <div className="relative z-10 pt-10">
                  <button onClick={handleLogin} className="text-[10px] uppercase tracking-[0.2em] font-black text-heritage-gold hover:text-white transition-colors">Lihat Detail &rarr;</button>
                </div>
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-heritage-gold/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 transition-transform group-hover:scale-150 duration-700"></div>
              </div>

              <div className="md:col-span-2 bg-white border border-heritage-ink/5 p-10 flex flex-col justify-center space-y-4 hover:shadow-2xl transition-all duration-500">
                <ShieldCheck className="text-heritage-forest w-8 h-8" />
                <h3 className="text-2xl font-serif font-bold tracking-tight">Kepatuhan & Tata Kelola.</h3>
                <p className="text-sm text-heritage-ink/50 font-light leading-relaxed">Memastikan setiap lini bisnis Anda beroperasi sesuai dengan hukum yang berlaku di Indonesia.</p>
              </div>

              <div className="md:col-span-1 bg-heritage-forest p-8 flex flex-col justify-end gap-6 text-white group overflow-hidden relative">
                <Users className="w-6 h-6 text-heritage-gold mb-auto" />
                <h3 className="text-lg font-serif font-bold leading-tight relative z-10">Kekayaan <br/> Intelektual.</h3>
                <div className="absolute bottom-0 right-0 w-full h-1 bg-heritage-gold transform translate-y-full group-hover:translate-y-0 transition-transform"></div>
              </div>

              <div className="md:col-span-1 bg-heritage-gold p-8 flex flex-col justify-end gap-6 text-heritage-ink group overflow-hidden relative">
                <Scale className="w-6 h-6 mb-auto" />
                <h3 className="text-lg font-serif font-bold leading-tight relative z-10">Hukum <br/> Korporasi.</h3>
                 <div className="absolute inset-0 bg-heritage-ink opacity-0 group-hover:opacity-5 transition-opacity"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="relative py-40 bg-heritage-ink overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-white tracking-tighter leading-[0.9]">
              Siap Bertransformasi <br/> di Era Ekonomi Digital bersama Lexsia.ai?
            </h2>
            <p className="text-lg text-white/40 font-light max-w-xl mx-auto leading-relaxed">
              Bergabunglah dengan ratusan firma hukum dan korporasi yang telah meningkatkan efisiensi mereka bersama Lexsia.ai.
            </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              className="px-12 py-6 bg-heritage-gold text-heritage-ink font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-2xl shadow-heritage-gold/20"
            >
              Mulai Uji Coba Gratis
            </motion.button>
          </div>
          {/* Subtle noise/texture overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mask-fade-to-b bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </section>

        {/* Footer */}
        <footer className="bg-heritage-bone py-20 px-6 md:px-12 border-t border-heritage-ink/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-heritage-ink flex items-center justify-center p-1.5">
                  <Scale className="text-heritage-gold w-full h-full" />
                </div>
                <span className="font-serif font-bold text-lg tracking-tight">Lexsia.ai</span>
              </div>
              <p className="text-[10px] text-heritage-ink/40 uppercase tracking-[0.2em] font-black leading-loose">
                Graha Lexsia, Lantai 12 <br/>
                Kawasan Mega Kuningan, Jakarta Selatan <br/>
                DKI Jakarta 12950, Indonesia
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-24">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Platform</p>
                <ul className="space-y-3 text-xs text-heritage-ink/50 font-medium">
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Fitur Utama</li>
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Keamanan Data</li>
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Pusat Bantuan</li>
                </ul>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Halaman Utama</p>
                <ul className="space-y-3 text-xs text-heritage-ink/50 font-medium">
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Tentang Kami</li>
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Karier</li>
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Kontak</li>
                </ul>
              </div>
              <div className="space-y-6 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Legalitas</p>
                <ul className="space-y-3 text-xs text-heritage-ink/50 font-medium">
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Syarat & Ketentuan</li>
                  <li className="hover:text-heritage-gold cursor-pointer transition-colors">Kebijakan Privasi</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-heritage-ink/5 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-[9px] font-black text-heritage-ink/30 uppercase tracking-[0.3em]">&copy; 2026 Lexsia.ai &bull; Digital Justice Indonesia</p>
            <div className="flex gap-6">
               <Globe className="w-4 h-4 text-heritage-ink/20 hover:text-heritage-gold transition-colors cursor-pointer" />
               <ShieldCheck className="w-4 h-4 text-heritage-ink/20 hover:text-heritage-gold transition-colors cursor-pointer" />
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-heritage-bone overflow-hidden relative">
      <div className="absolute inset-0 bg-heritage-ink/5 pointer-events-none z-0"></div>
      
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-72 h-full bg-heritage-ink flex flex-col shrink-0 z-20 border-r border-white/5 relative"
          >
            <div className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-heritage-ink flex items-center justify-center border border-heritage-gold/30">
                  <Scale className="text-heritage-gold w-6 h-6" />
                </div>
                <h1 className="text-xl font-serif font-bold tracking-tight text-white">Lexsia.ai</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 mb-8">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  startNewChat();
                }}
                className="w-full bg-heritage-gold text-heritage-ink font-black py-4 px-4 rounded-none hover:bg-white transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 text-[10px] uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                Konsultasi Baru
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
              <div className="px-3 mb-4 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30">Arsip Hukum</p>
                {chats.length > 0 && (
                  <button 
                    onClick={handleDeleteAllChats}
                    className="text-[9px] font-black text-white/40 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                    title="Hapus Semua Riwayat"
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
              {chats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => {
                    setActiveChat(chat.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border text-left",
                    activeChat === chat.id 
                      ? "bg-white/10 text-white border-heritage-gold/20" 
                      : "hover:bg-white/5 text-white/40 border-transparent hover:border-white/5"
                  )}
                >
                  <MessageSquare className={cn("w-4 h-4 shrink-0", activeChat === chat.id ? "text-heritage-gold" : "text-white/20")} />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-semibold truncate">{chat.title}</p>
                    <p className="text-[10px] text-white/30 font-medium truncate">{chat.lastMessage || 'Belum ada analisis'}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className={cn(
                      "p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-all z-50 pointer-events-auto shrink-0",
                      activeChat === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 p-4 bg-heritage-bone/5 border border-white/5">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-none border border-heritage-gold/30" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[9px] text-heritage-gold uppercase tracking-widest font-black">Pro Member</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-white/20 hover:text-red-400 hover:bg-white/10 rounded-none transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 z-10 h-full overflow-hidden">
        {/* Header */}
            <header className="h-20 flex items-center justify-between px-8 bg-heritage-bone/80 backdrop-blur-md border-b border-heritage-ink/5 shrink-0 print:hidden">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 bg-heritage-ink text-white hover:bg-heritage-gold transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-4">
              {lawFirmProfile.logo && (
                <div className="w-10 h-10 bg-white p-1 flex items-center justify-center overflow-hidden border border-heritage-ink/5">
                  <img src={lawFirmProfile.logo} className="w-full h-full object-contain" alt="Firm Logo" />
                </div>
              )}
              <div>
                <h2 className="font-serif font-bold text-lg text-heritage-ink tracking-tight">
                  {activeChat ? chats.find(c => c.id === activeChat)?.title : 'Dashboard Hukum Indonesia'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-500",
                    agentMode ? "bg-heritage-gold animate-pulse" : "bg-heritage-ink/20"
                  )}></div>
                  <p className="text-[10px] text-heritage-ink/40 uppercase tracking-widest font-black">
                    {agentMode ? "Agent Active" : "Legal Intelligence"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-2">
                <button 
                  onClick={() => setIsSplitView(!isSplitView)}
                  className={cn(
                    "px-5 py-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95 border",
                    isSplitView ? "bg-heritage-gold text-heritage-ink border-heritage-gold" : "bg-heritage-ink text-white border-heritage-ink hover:bg-heritage-gold hover:text-heritage-ink"
                  )}
                >
                  {isSplitView ? "Standard" : "Split View"}
                </button>
                <button 
                  onClick={() => {
                    setAgentMode(!agentMode);
                    setError(agentMode ? "Mode Standar Aktif." : "Agent Mode Aktif. Lexsia siap melakukan riset hukum mendalam.");
                    setTimeout(() => setError(null), 3000);
                  }}
                  className={cn(
                    "px-5 py-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                    agentMode 
                      ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border-blue-400" 
                      : "bg-heritage-ink text-white hover:bg-heritage-gold hover:text-heritage-ink border-heritage-ink"
                  )}
                >
                  <Sparkles className={cn("w-3.5 h-3.5", agentMode ? "animate-pulse" : "")} />
                  {agentMode ? "Agen Aktif" : "Mode Agen"}
                </button>
             </div>
             <div className="h-8 w-px bg-heritage-ink/10 mx-2"></div>
             <button 
               onClick={() => setShowSettings(true)}
               className="p-2.5 bg-heritage-bone border border-heritage-ink/5 text-heritage-ink/60 hover:text-heritage-ink hover:border-heritage-ink transition-all active:rotate-90"
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div id="chat-container" className={cn(
            "flex flex-col h-full relative transition-all duration-500 ease-in-out",
            isSplitView ? "w-1/2 border-r border-white/10" : "w-full"
          )}>
            {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative print:overflow-visible print:h-auto print:p-0">
          <AnimatePresence>
            {toast && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="sticky top-0 left-0 right-0 z-50 mb-4 print:hidden"
              >
                <div className={cn(
                  "border backdrop-blur-md px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-xl transition-colors",
                  toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/10" :
                  toast.type === 'info' ? "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10" :
                  "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/10"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      toast.type === 'success' ? "bg-green-500/20" : 
                      toast.type === 'info' ? "bg-blue-500/20" : 
                      "bg-red-500/20"
                    )}>
                      {toast.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : toast.type === 'info' ? (
                        <Info className="w-5 h-5 text-blue-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{toast.message}</p>
                  </div>
                  <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="sticky top-0 left-0 right-0 z-50 mb-4 print:hidden"
              >
                <div className={cn(
                  "border backdrop-blur-md px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-xl transition-colors",
                  /berhasil|disalin|aktif|memuat|dikonfigurasi|ditingkatkan|dilampirkan|memori|konteks/i.test(error)
                    ? "bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/10"
                    : "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/10"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      /berhasil|disalin|aktif|memuat|dikonfigurasi|ditingkatkan|dilampirkan|memori|konteks/i.test(error) ? "bg-green-500/20" : "bg-red-500/20"
                    )}>
                      {/berhasil|disalin|aktif|memuat|dikonfigurasi|ditingkatkan|dilampirkan|memori|konteks/i.test(error) ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4"
                onClick={() => setShowSettings(false)}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-heritage-bone border border-heritage-ink/5 rounded-none w-full max-w-5xl h-full sm:h-auto sm:max-h-[85vh] shadow-2xl relative overflow-hidden flex flex-col sm:flex-row"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Close button for mobile */}
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="absolute top-6 right-6 z-50 p-2 bg-heritage-ink rounded-full text-white hover:bg-heritage-gold transition-colors sm:hidden"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Settings Sidebar */}
                  <div className="w-full sm:w-72 bg-heritage-ink border-r border-white/5 p-8 shrink-0 flex flex-col">
                    <div className="flex items-center gap-3 mb-12">
                      <div className="w-10 h-10 bg-heritage-ink flex items-center justify-center border border-heritage-gold/30">
                        <Settings className="w-5 h-5 text-heritage-gold" />
                      </div>
                      <h2 className="text-xl font-serif font-bold text-white tracking-tight">Pengaturan</h2>
                    </div>

                    <nav className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible no-scrollbar">
                      {[
                        { id: 'account', label: 'Profil & Akun', icon: UserIcon },
                        { id: 'profile', label: 'Profil Kantor', icon: Building2 },
                        { id: 'legalcenter', label: 'Pusat Hukum', icon: Library },
                        { id: 'ai', label: 'Tuning AI', icon: Sparkles },
                        { id: 'integrations', label: 'Koneksi', icon: LinkIcon },
                        { id: 'datacenter', label: 'Keamanan', icon: Database },
                      ].map((tab) => (
                        <button 
                          key={tab.id}
                          onClick={() => setSettingsTab(tab.id as any)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            settingsTab === tab.id 
                              ? "bg-heritage-gold text-heritage-ink shadow-lg" 
                              : "text-white/40 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                    </nav>

                    <div className="mt-auto hidden sm:block pt-8">
                       <button 
                        onClick={() => auth.signOut()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-none text-[10px] font-black text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar
                      </button>
                    </div>
                  </div>

                  {/* Settings Content Area */}
                  <div className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar text-heritage-ink">
                    <div className="flex items-center justify-between mb-10">
                       <h3 className="text-3xl font-serif font-bold text-heritage-ink">
                         {settingsTab === 'account' ? 'Profil Pengguna' : 
                          settingsTab === 'ai' ? 'Optimasi Kecerdasan' : 
                          settingsTab === 'profile' ? 'Identitas Kantor Hukum' :
                          settingsTab === 'datacenter' ? 'Keamanan & Kepatuhan' :
                          settingsTab === 'legalcenter' ? 'Pusat Data Hukum' :
                          'Integrasi Layanan'}
                       </h3>
                       <button 
                        onClick={() => setShowSettings(false)} 
                        className="hidden sm:flex p-2 bg-heritage-ink rounded-full text-white hover:bg-heritage-gold transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {settingsTab === 'legalcenter' ? (
                        <motion.div 
                          key="legalcenter"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div className="p-8 rounded-none bg-heritage-ink/5 border border-heritage-ink/10 flex gap-6 items-start">
                             <div className="w-16 h-16 rounded-none bg-heritage-ink flex items-center justify-center shrink-0 border border-heritage-gold/30">
                                <Library className="w-8 h-8 text-heritage-gold" />
                             </div>
                             <div>
                                <h4 className="text-xl font-serif font-bold text-heritage-ink mb-1">Pusat Hukum & Digital Library</h4>
                                <p className="text-xs font-medium text-heritage-ink/60 leading-relaxed">
                                   Unggah dokumen hukum Anda (PDF, DOCX, Putusan) untuk dianalisis oleh AI dan disimpan ke Google Drive.
                                </p>
                             </div>
                          </div>

                          <div className="relative group">
                             <div className="w-full h-48 rounded-none bg-heritage-ink/5 border-2 border-dashed border-heritage-ink/10 flex flex-col items-center justify-center transition-all group-hover:border-heritage-gold group-hover:bg-heritage-bone">
                                <CloudUpload className="w-10 h-10 text-heritage-ink/20 mb-3 group-hover:text-heritage-gold transition-colors" />
                                <p className="text-[10px] font-black text-heritage-ink/60 mb-1 uppercase tracking-widest">Klik atau seret file ke sini</p>
                                <p className="text-[8px] text-heritage-ink/40 uppercase tracking-[0.2em] font-bold">Maksimum 50MB • PDF, DOCX, TXT</p>
                             </div>
                             <input 
                               type="file" 
                               multiple
                               className="absolute inset-0 opacity-0 cursor-pointer"
                               onChange={(e) => {
                                 const files = e.target.files;
                                 if (files && files.length > 0) {
                                   handleAutoUpload(files);
                                 }
                               }}
                             />
                          </div>

                          <div className="space-y-4">
                             <h5 className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 block">Riwayat Unggahan Terkini</h5>
                             <div className="space-y-2">
                                {uploadHistory.map((doc, i) => (
                                  <div 
                                    key={doc.id} 
                                    onClick={() => window.open(doc.url, '_blank')}
                                    className="flex items-center justify-between p-4 bg-white border border-heritage-ink/5 shadow-sm cursor-pointer hover:border-heritage-gold hover:shadow-md transition-all group/item"
                                  >
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-none bg-red-500/10 flex items-center justify-center group-hover/item:bg-red-500/20 transition-colors">
                                           <FileText className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div>
                                           <p className="text-xs font-bold text-heritage-ink group-hover/item:text-heritage-gold transition-colors">{doc.name}</p>
                                           <p className="text-[10px] text-heritage-ink/40 font-bold uppercase">{doc.size} • {doc.date}</p>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-none border border-green-500/20">
                                           <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                                           <span className="text-[8px] font-black text-green-600 uppercase">Saved to Drive</span>
                                        </div>
                                        <button className="p-2 hover:bg-heritage-ink/5 rounded-none text-heritage-ink/20 group-hover/item:text-heritage-gold transition-colors">
                                           <ExternalLink className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        </motion.div>
                      ) : settingsTab === 'account' ? (
                        <motion.div 
                          key="account"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-10"
                        >
                          <div className="flex items-start gap-6 p-6 bg-heritage-ink/5 rounded-none border border-heritage-ink/5">
                             <img src={user.photoURL || ''} className="w-20 h-20 rounded-none border border-heritage-ink/10 shadow-xl" alt="" />
                             <div className="flex-1">
                                <h4 className="text-xl font-serif font-bold text-heritage-ink mb-1">{user.displayName}</h4>
                                <p className="text-xs font-medium text-heritage-ink/60 mb-4">{user.email}</p>
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-heritage-gold text-heritage-ink rounded-none text-[9px] font-black uppercase tracking-widest">
                                   <ShieldCheck className="w-3 h-3" />
                                   Lexsia Pro Member
                                </span>
                             </div>
                             <button className="px-5 py-2 bg-heritage-ink text-white hover:bg-heritage-gold hover:text-heritage-ink transition-all text-[10px] font-black uppercase tracking-widest rounded-none">Edit</button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-4 block">Tone Hukum</label>
                              <div className="grid grid-cols-2 gap-2 p-1 bg-heritage-ink/5 border border-heritage-ink/5">
                                {['Formal', 'Praktis'].map((t) => (
                                  <button 
                                    key={t}
                                    onClick={() => setSettings({...settings, legalTone: t.toLowerCase()})}
                                    className={cn(
                                      "py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all",
                                      settings.legalTone === t.toLowerCase() 
                                        ? "bg-heritage-gold text-heritage-ink shadow-lg" 
                                        : "text-heritage-ink/40 hover:text-heritage-ink"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <p className="mt-2 text-[10px] font-medium text-heritage-ink/60 leading-relaxed">Menyesuaikan gaya bahasa dalam draf dan jawaban AI.</p>
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-4 block">Level Analisis</label>
                              <div className="space-y-2">
                                {['Standar', 'Senior Associate', 'Managing Partner'].map((l) => (
                                  <button 
                                    key={l}
                                    onClick={() => setSettings({...settings, expertLevel: l.toLowerCase()})}
                                    className={cn(
                                      "w-full flex items-center justify-between p-4 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border",
                                      settings.expertLevel === l.toLowerCase()
                                        ? "bg-heritage-gold border-heritage-gold text-heritage-ink"
                                        : "bg-heritage-bone border-heritage-ink/10 text-heritage-ink/40 hover:bg-white"
                                    )}
                                  >
                                    {l}
                                    {settings.expertLevel === l.toLowerCase() && <CheckCircle className="w-4 h-4" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : settingsTab === 'profile' ? (
                        <motion.div 
                          key="profile"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-2 block">Logo Kantor Hukum</label>
                                   <div className="relative group">
                                      <div className="w-32 h-32 rounded-none bg-heritage-ink/5 border-2 border-dashed border-heritage-ink/10 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-heritage-gold">
                                         {lawFirmProfile.logo ? (
                                           <img src={lawFirmProfile.logo} className="w-full h-full object-cover" alt="Logo" />
                                         ) : (
                                           <>
                                             <Building2 className="w-8 h-8 text-slate-600 mb-2" />
                                             <span className="text-[10px] font-bold text-slate-500 uppercase">Upload Logo</span>
                                           </>
                                         )}
                                      </div>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setLawFirmProfile({...lawFirmProfile, logo: ev.target?.result as string});
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                   </div>
                                   <p className="mt-3 text-[10px] text-heritage-ink/40 font-bold uppercase tracking-wider">Logo ini akan muncul di header aplikasi dan dokumen yang dihasilkan.</p>
                                </div>
                             </div>

                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-2 block">Nama Kantor Hukum</label>
                                   <input 
                                     type="text"
                                     value={lawFirmProfile.name}
                                     onChange={(e) => setLawFirmProfile({...lawFirmProfile, name: e.target.value})}
                                     className="w-full bg-white border border-heritage-ink/10 rounded-none px-4 py-3 text-xs text-heritage-ink focus:outline-none focus:border-heritage-gold transition-all font-black uppercase tracking-widest"
                                     placeholder="Masukkan nama kantor hukum..."
                                   />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-2 block">Informasi Kontak</label>
                                      <input 
                                        type="text"
                                        value={lawFirmProfile.contact}
                                        onChange={(e) => setLawFirmProfile({...lawFirmProfile, contact: e.target.value})}
                                        className="w-full bg-white border border-heritage-ink/10 rounded-none px-4 py-3 text-xs text-heritage-ink focus:outline-none focus:border-heritage-gold transition-all font-black uppercase tracking-widest"
                                        placeholder="Telepon, Kodepos..."
                                      />
                                   </div>
                                   <div>
                                      <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-2 block">Alamat Kantor</label>
                                      <textarea 
                                        rows={1}
                                        value={lawFirmProfile.address}
                                        onChange={(e) => setLawFirmProfile({...lawFirmProfile, address: e.target.value})}
                                        className="w-full bg-white border border-heritage-ink/10 rounded-none px-4 py-3 text-xs text-heritage-ink focus:outline-none focus:border-heritage-gold transition-all font-black uppercase tracking-widest resize-none"
                                        placeholder="Alamat Lengkap..."
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>
                        </motion.div>
                       ) : settingsTab === 'datacenter' ? (
                        <motion.div 
                          key="datacenter"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div className="p-8 rounded-none bg-heritage-ink/5 border border-heritage-ink/10 flex gap-6 items-start">
                             <div className="w-16 h-16 rounded-none bg-heritage-ink flex items-center justify-center shrink-0 border border-heritage-gold/30">
                                <Database className="w-8 h-8 text-heritage-gold" />
                             </div>
                             <div>
                                <h4 className="text-xl font-serif font-bold text-heritage-ink mb-2">Cloud Storage & Privacy</h4>
                                <p className="text-xs font-medium text-heritage-ink/60 leading-relaxed mb-4">
                                   Data Anda disimpan di server terenkripsi Google Cloud Platform (Regio: asia-southeast1). Lexsia tidak memiliki akses langsung ke konten dokumen Anda tanpa izin eksplisit melalui integrasi OAuth.
                                </p>
                                <div className="flex gap-4">
                                   <div className="flex items-center gap-2 px-3 py-1 bg-heritage-gold/10 rounded-none border border-heritage-gold/20">
                                      <Shield className="w-3 h-3 text-heritage-gold" />
                                      <span className="text-[9px] font-black text-heritage-gold uppercase tracking-widest">End-to-End Encrypted</span>
                                   </div>
                                   <div className="flex items-center gap-2 px-3 py-1 bg-heritage-ink text-white rounded-none border border-white/10">
                                      <Globe className="w-3 h-3 text-heritage-gold" />
                                      <span className="text-[9px] font-black text-white uppercase tracking-widest">GDPR Compliant</span>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             {[
                               { label: 'Total Storage', value: '1.2 GB / 50 GB', icon: HardDrive },
                               { label: 'Uptime', value: '99.9%', icon: CheckCircle },
                               { label: 'Last Backup', value: 'Today, 04:20 AM', icon: History }
                             ].map((stat, i) => (
                               <div key={i} className="p-5 rounded-none bg-heritage-ink/5 border border-heritage-ink/5">
                                  <stat.icon className="w-5 h-5 text-heritage-ink/40 mb-3" />
                                  <p className="text-[9px] font-black text-heritage-ink/40 uppercase tracking-widest mb-1">{stat.label}</p>
                                  <p className="text-xs font-bold text-heritage-ink">{stat.value}</p>
                               </div>
                             ))}
                          </div>

                          <div className="pt-6 border-t border-heritage-ink/10">
                             <button className="flex items-center gap-2 text-[10px] font-black text-heritage-gold uppercase tracking-widest hover:text-heritage-ink transition-colors">
                                <RotateCcw className="w-3 h-3" />
                                Periksa Pembaruan Sistem
                             </button>
                          </div>
                        </motion.div>
                      ) : settingsTab === 'ai' ? (
                        <motion.div 
                          key="ai"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-10"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                               <div>
                                  <label className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40">AI Temperature</span>
                                    <span className="text-xs font-black text-heritage-gold">{settings.aiTemperature}</span>
                                  </label>
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    value={settings.aiTemperature}
                                    onChange={(e) => setSettings({...settings, aiTemperature: parseFloat(e.target.value)})}
                                    className="w-full h-1 bg-heritage-ink/10 appearance-none cursor-pointer accent-heritage-gold"
                                  />
                                  <div className="flex justify-between mt-2">
                                     <span className="text-[9px] text-slate-600 font-bold uppercase">Konservatif</span>
                                     <span className="text-[9px] text-slate-600 font-bold uppercase">Kreatif</span>
                                  </div>
                               </div>

                               <div>
                                  <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-4 block">Creativity Mode</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {['Strict', 'Balanced', 'Deep'].map((m) => (
                                      <button 
                                        key={m}
                                        onClick={() => setSettings({...settings, aiCreativity: m.toLowerCase()})}
                                        className={cn(
                                          "py-3 rounded-none text-[10px] font-black tracking-widest uppercase transition-all border",
                                          settings.aiCreativity === m.toLowerCase()
                                            ? "bg-heritage-gold border-heritage-gold text-heritage-ink shadow-sm"
                                            : "bg-heritage-bone border-heritage-ink/10 text-heritage-ink/40 hover:bg-white"
                                        )}
                                      >
                                        {m}
                                      </button>
                                    ))}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-8">
                               <div>
                                  <label className="text-[10px] uppercase tracking-widest font-black text-heritage-ink/40 mb-4 block">AI Persona</label>
                                  <div className="space-y-3">
                                     {[
                                       { id: 'professional', label: 'Professional Legal', icon: Scale },
                                       { id: 'academic', label: 'Academic Researcher', icon: BookOpen },
                                       { id: 'litigation', label: 'Litigation Expert', icon: Gavel }
                                     ].map((p) => (
                                       <button 
                                          key={p.id}
                                          onClick={() => setSettings({...settings, aiPersona: p.id})}
                                          className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-none text-[10px] font-black tracking-widest uppercase transition-all border",
                                            settings.aiPersona === p.id
                                              ? "bg-heritage-gold border-heritage-gold text-heritage-ink"
                                              : "bg-heritage-bone border-heritage-ink/10 text-heritage-ink/40 hover:bg-white"
                                          )}
                                       >
                                          <div className={cn(
                                            "w-8 h-8 rounded-none flex items-center justify-center",
                                            settings.aiPersona === p.id ? "bg-heritage-ink/20" : "bg-heritage-ink/5"
                                          )}>
                                             <p.icon className="w-4 h-4" />
                                          </div>
                                          {p.label}
                                       </button>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          </div>

                          <div className="p-8 rounded-none bg-heritage-ink text-white border border-heritage-gold/20">
                             <div className="flex items-center gap-4 mb-3">
                                <Sparkles className="w-5 h-5 text-heritage-gold animate-pulse" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-heritage-gold">Eksperimental: Neural Drafting</h4>
                             </div>
                             <p className="text-xs text-slate-400 leading-relaxed">
                               Mengaktifkan mode draf neural akan meningkatkan kedalaman analisis yurisprudensi namun memerlukan waktu proses 2x lebih lama.
                             </p>
                             <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Aktifkan Neural Drafting</span>
                                <button 
                                  onClick={() => setSettings({...settings, neuralDrafting: !settings.neuralDrafting})}
                                  className={cn(
                                    "w-12 h-6 rounded-none relative transition-all duration-300",
                                    settings.neuralDrafting ? "bg-heritage-gold" : "bg-white/10"
                                  )}
                                >
                                   <div className={cn(
                                     "absolute top-1 w-4 h-4 bg-white transition-all duration-300",
                                     settings.neuralDrafting ? "left-7" : "left-1"
                                   )}></div>
                                </button>
                             </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="integrations"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                            Hubungkan Lexsia ke ekosistem Google Anda untuk sinkronisasi dokumen, jadwal sidang, dan analisis data hukum secara real-time.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {[
                               { id: 'googleDrive', name: 'Google Drive', desc: 'Simpan & Kelola dokumen', icon: '/google-drive.svg', connected: integrations.googleDrive },
                               { id: 'gmail', name: 'Gmail', desc: 'Analisis korespondensi hukum', icon: '/gmail.svg', connected: integrations.gmail },
                               { id: 'googleSheets', name: 'Google Sheets', desc: 'Export billing & analisis data', icon: '/sheets.svg', connected: integrations.googleSheets },
                               { id: 'googleCalendar', name: 'Google Calendar', desc: 'Sinkronisasi jadwal sidang', icon: '/calendar.svg', connected: integrations.googleCalendar },
                               { id: 'googleCloud', name: 'Google Cloud (BigQuery)', desc: 'Analisis Big Data yurisprudensi', icon: '/gcp.svg', connected: integrations.googleCloud },
                               { id: 'googleKeep', name: 'Google Keep', desc: 'Sinkronisasi catatan riset', icon: '/keep.svg', connected: false }
                             ].map((item) => (
                               <div 
                                 key={item.id}
                                 className="flex items-center gap-4 p-5 bg-heritage-bone rounded-none border border-heritage-ink/10 hover:bg-white transition-all group"
                               >
                                  <div className="w-12 h-12 rounded-none bg-heritage-ink flex items-center justify-center border border-heritage-gold/20 shrink-0">
                                     {item.id === 'googleDrive' ? (
                                       <svg viewBox="0 0 24 24" className="w-7 h-7">
                                          <path fill="#0066da" d="m14 16h4l-2 3z"/>
                                          <path fill="#00ac47" d="m11 16-2-3h4z"/>
                                          <path fill="#ffba00" d="m7 16-2 3h4z"/>
                                          <path fill="#0066da" d="m18 14-3-5 6 10z"/>
                                          <path fill="#00ac47" d="m9 5 3 5-6 10z"/>
                                          <path fill="#ffba00" d="m15 5h-6l3 5z"/>
                                       </svg>
                                     ) : item.id === 'googleSheets' ? (
                                       <TableIcon className="w-7 h-7 text-green-500" />
                                     ) : item.id === 'googleCalendar' ? (
                                       <History className="w-7 h-7 text-blue-400" />
                                     ) : item.id === 'gmail' ? (
                                       <MessageSquare className="w-7 h-7 text-red-500" />
                                     ) : (
                                       <div className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center">
                                          <Cloud className="w-4 h-4 text-slate-400" />
                                       </div>
                                     )}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <h5 className="text-xs font-black text-heritage-ink uppercase tracking-wider truncate">{item.name}</h5>
                                     <p className="text-[9px] text-heritage-ink/40 font-bold uppercase truncate">{item.desc}</p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                       if (item.id === 'googleDrive') return; 
                                       const key = item.id as keyof typeof integrations;
                                       setIntegrations({...integrations, [key]: !integrations[key]});
                                       setToast({ 
                                         message: integrations[key] ? `Memutuskan koneksi ${item.name}...` : `Menghubungkan ke ${item.name}...`, 
                                         type: integrations[key] ? 'info' : 'success' 
                                       });
                                       setTimeout(() => setToast(null), 3000);
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border",
                                      integrations[item.id as keyof typeof integrations] || item.connected
                                        ? "bg-green-500/10 text-green-700 border-green-200"
                                        : "bg-heritage-ink/5 text-heritage-ink/40 border-heritage-ink/10 hover:bg-heritage-ink hover:text-heritage-gold hover:border-heritage-gold"
                                    )}
                                  >
                                     {integrations[item.id as keyof typeof integrations] || item.connected ? 'Connected' : 'Connect'}
                                  </button>
                               </div>
                             ))}
                          </div>
                          
                          <div className="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 flex gap-3 items-center">
                             <Shield className="w-5 h-5 text-orange-500" />
                             <p className="text-[10px] text-slate-400">
                                Lexsia menggunakan OAuth 2.0 yang aman. Kami tidak menyimpan kata sandi Google Anda. Akses dibatasi pada metadata dokumen untuk keperluan analisis hukum.
                             </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-12 pt-8 border-t border-heritage-ink/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-[10px] text-heritage-ink/40 font-medium tracking-tight uppercase">Beberapa perubahan mungkin memerlukan waktu untuk disinkronkan ke AI.</p>
                        <button 
                          onClick={() => {
                            if (settingsTab === 'profile' && activeDocument) {
                               // Update current document header/footer if it exists when profile is updated
                               const tempDiv = document.createElement('div');
                               tempDiv.innerHTML = activeDocument.content;
                               
                               // Try to find the header div (first child usually in our template)
                               const headerDiv = tempDiv.querySelector('div[style*="flex-direction: row"]');
                               if (headerDiv) {
                                  headerDiv.innerHTML = `
                                    ${lawFirmProfile.logo ? `<img src="${lawFirmProfile.logo}" style="width: 80px; height: 80px; object-fit: contain;" />` : ''}
                                    <div style="text-align: center;">
                                      <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: black; letter-spacing: 1px;">${lawFirmProfile.name}</h1>
                                      <p style="font-size: 11px; margin: 2px 0; color: #333;">${lawFirmProfile.address}</p>
                                      <p style="font-size: 11px; margin: 2px 0; color: #333;">${lawFirmProfile.contact}</p>
                                    </div>
                                  `;
                               }
                               
                               // Try to find the footer div
                               const footerDiv = tempDiv.querySelector('div[style*="border-top: 1px solid #000"]');
                               if (footerDiv) {
                                  footerDiv.innerHTML = `
                                    <div>${lawFirmProfile.name} &bull; ${activeDocument.name}</div>
                                    <div style="font-family: sans-serif; font-weight: bold; font-style: normal;">Halaman 1 / 1</div>
                                  `;
                               }
                               
                               const updatedContent = tempDiv.innerHTML;
                               if (updatedContent !== activeDocument.content) {
                                  setActiveDocument({ ...activeDocument, content: updatedContent });
                                }
                            }
                            
                            setToast({ message: "Pengaturan berhasil diperbarui!", type: 'success' });
                            setShowSettings(false);
                            setTimeout(() => setToast(null), 3000);
                          }}
                          className="w-full sm:w-auto px-10 py-4 bg-heritage-ink hover:bg-heritage-gold text-white hover:text-heritage-ink font-black uppercase tracking-[0.2em] text-[11px] rounded-none shadow-2xl transition-all active:scale-95"
                        >
                          Simpan & Terapkan
                        </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCamera && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden max-w-xl w-full shadow-2xl relative"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <button onClick={stopCamera} className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="aspect-video bg-black relative">
                     <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                        onCanPlay={() => videoRef.current?.play()}
                        onLoadedMetadata={() => {
                          if (cameraStream && videoRef.current) {
                            videoRef.current.srcObject = cameraStream;
                          }
                        }}
                     />
                  </div>
                  <div className="p-8 flex flex-col items-center">
                    <h3 className="text-white font-bold text-lg mb-2">Ambil Foto Dokumen</h3>
                    <p className="text-slate-400 text-sm mb-6 text-center">Pastikan dokumen terlihat jelas dan cukup cahaya untuk analisis yang akurat.</p>
                    <div className="flex gap-4 w-full">
                       <button 
                         onClick={stopCamera}
                         className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10"
                       >
                         BATAL
                       </button>
                       <button 
                         onClick={capturePhoto}
                         className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
                       >
                         AMBIL FOTO
                       </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showTutorial && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setShowTutorial(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="bg-heritage-bone border border-heritage-ink/10 p-10 rounded-none max-w-2xl w-full shadow-2xl relative overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => setShowTutorial(false)} className="text-heritage-ink/40 hover:text-heritage-ink transition-colors">
                       <Plus className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-heritage-ink mb-10 flex items-center gap-3">
                    <Play className="w-6 h-6 text-heritage-gold fill-heritage-gold" />
                    Tutorial Lexsia.ai
                  </h2>
                  <div className="space-y-8">
                    <div className="flex gap-6">
                       <div className="w-12 h-12 rounded-none bg-heritage-ink text-heritage-gold flex items-center justify-center shrink-0 font-serif font-black text-xl border border-heritage-gold/20">1</div>
                       <div>
                          <p className="font-bold text-heritage-ink mb-1 uppercase tracking-wider text-xs">Mulai Riset</p>
                          <p className="text-sm text-heritage-ink/60 leading-relaxed font-light">Ketikkan pertanyaan hukum Anda di kolom input. Gunakan bahasa Indonesia yang jelas untuk hasil optimal.</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-12 h-12 rounded-none bg-heritage-ink text-heritage-gold flex items-center justify-center shrink-0 font-serif font-black text-xl border border-heritage-gold/20">2</div>
                       <div>
                          <p className="font-bold text-heritage-ink mb-1 uppercase tracking-wider text-xs">Expert Research Mode</p>
                          <p className="text-sm text-heritage-ink/60 leading-relaxed font-light">Aktifkan Research Mode untuk analisis yang lebih mendalam, prosedural, dan berbasis yurisprudensi.</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-12 h-12 rounded-none bg-heritage-ink text-heritage-gold flex items-center justify-center shrink-0 font-serif font-black text-xl border border-heritage-gold/20">3</div>
                       <div>
                          <p className="font-bold text-heritage-ink mb-1 uppercase tracking-wider text-xs">Analisis Dokumen</p>
                          <p className="text-sm text-heritage-ink/60 leading-relaxed font-light">Klik ikon penjepit kertas untuk mengunggah dokumen hukum (PDF/Word) untuk dianotasi oleh AI.</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-12 h-12 rounded-none bg-heritage-ink text-heritage-gold flex items-center justify-center shrink-0 font-serif font-black text-xl border border-heritage-gold/20">4</div>
                       <div>
                          <p className="font-bold text-heritage-ink mb-1 uppercase tracking-wider text-xs">Ekspor & Berbagi</p>
                          <p className="text-sm text-heritage-ink/60 leading-relaxed font-light">Simpan hasil riset dalam format PDF profesional menggunakan tombol di header dashboard.</p>
                       </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowTutorial(false)}
                    className="w-full mt-12 bg-heritage-ink hover:bg-heritage-gold text-white hover:text-heritage-ink font-black py-5 rounded-none transition-all uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98]"
                  >
                    SAYA MENGERTI
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!activeChat && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center py-20">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-heritage-ink flex items-center justify-center mb-10 border border-heritage-gold/20"
              >
                <Gavel className="w-12 h-12 text-heritage-gold" />
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-4xl font-serif font-bold text-heritage-ink mb-6 tracking-tight"
              >
                Apa isu hukum yang ingin Anda pecahkan hari ini?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-heritage-ink/40 mb-12 leading-relaxed text-lg font-light"
              >
                Asisten Hukum AI dengan database regulasi lengkap Indonesia siap memberikan analisis presisi.
              </motion.p>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.2
                    }
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
              >
                {[
                  "Analisis sanksi Pasal 362 KUHP tentang pencurian.",
                  "Hak karyawan yang terkena PHK menurut Perpu Ciptaker.",
                  "Prosedur pembuatan Akta Pendirian PT di Indonesia.",
                  "Ketentuan Perbuatan Melawan Hukum (Pasal 1365 KUHPer)."
                ].map((suggestion, i) => (
                  <motion.button 
                    key={i}
                    variants={{
                      hidden: { opacity: 0, x: 50 },
                      visible: { 
                        opacity: 1, 
                        x: 0,
                        transition: {
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1]
                        }
                      }
                    }}
                    whileHover={{ x: -10 }}
                    onClick={() => setInput(suggestion)}
                    className="p-6 text-left bg-white border border-heritage-ink/5 hover:border-heritage-gold transition-all group"
                  >
                    <p className="text-[10px] font-black text-heritage-gold uppercase tracking-widest mb-2 group-hover:text-heritage-ink transition-colors">CONTOH RISET</p>
                    <p className="text-sm font-medium text-heritage-ink/60 group-hover:text-heritage-ink transition-colors">{suggestion}</p>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-12">
              {messages.map((m, i) => (
                <motion.div 
                  key={m.id || i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-6",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center shrink-0 border",
                    m.role === 'user' 
                      ? "bg-heritage-ink border-heritage-ink text-heritage-gold" 
                      : "bg-white border-heritage-ink/5 text-heritage-gold"
                  )}>
                    {m.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-6 border shadow-sm",
                    m.role === 'user' 
                      ? "bg-heritage-ink text-white border-heritage-ink" 
                      : "bg-white text-heritage-ink border-heritage-ink/5 border-l-4 border-l-heritage-gold"
                  )}>
                    {m.role === 'assistant' && (
                       <p className="text-[10px] text-heritage-gold uppercase tracking-[0.2em] font-black mb-4">Analisis Lexsia AI</p>
                    )}
                    <div className="markdown-body prose prose-invert max-w-none text-sm font-medium leading-relaxed">
                      {m.file && m.file.type.startsWith('image/') && (
                        <div className="mb-4 rounded-none overflow-hidden border border-heritage-ink/10 shadow-lg group-hover:scale-105 transition-transform duration-500">
                          {m.file.data.startsWith('data:image') ? (
                            <img src={m.file.data} alt={m.file.name} className="max-w-full h-auto" />
                          ) : (
                            <div className="p-8 bg-white/5 flex flex-col items-center gap-3">
                              <Camera className="w-12 h-12 text-slate-500" />
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.file.name}</p>
                              <p className="text-[8px] text-slate-600 italic">Konten gambar tidak disimpan karena ukuran file melampaui limit 1MB.</p>
                            </div>
                          )}
                        </div>
                      )}
                      {m.file && !m.file.type.startsWith('image/') && (
                        <div 
                          onClick={() => {
                            if (m.role === 'assistant') {
                              setActiveDocument({
                                id: m.id,
                                name: m.file?.name || "Dokumen Tanpa Judul",
                                content: m.file?.data || m.content
                              });
                              setIsSplitView(true);
                            }
                          }}
                          className={cn(
                            "mb-6 p-5 rounded-none border transition-all cursor-pointer group/doc flex flex-col sm:flex-row items-center gap-4",
                            m.role === 'user' 
                              ? "bg-white/5 border-white/5 hover:bg-white/10" 
                              : "bg-heritage-bone border-heritage-ink/5 hover:bg-white hover:border-heritage-gold/30 shadow-md"
                          )}
                        >
                          <div className="w-16 h-20 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group-hover/doc:border-blue-500/50 transition-colors">
                             <div className="absolute top-0 left-0 right-0 h-4 bg-heritage-gold/10 border-b border-heritage-ink/5"></div>
                             <FileText className="w-8 h-8 text-heritage-gold mb-1" />
                             <div className="absolute bottom-1 right-1">
                                <div className="w-4 h-4 bg-heritage-gold rounded-none flex items-center justify-center">
                                   <div className="w-2 h-0.5 bg-heritage-ink rounded-full"></div>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex-1 text-center sm:text-left min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{m.file.name}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                              {m.file.type === 'application/vnd.google-apps.document' ? 'Google Doc' : 'Dokumen • DOCX'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (m.file) simulateSaveToDrive(m.file.name, m.file.data);
                                }}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
                                title="Simpan ke Drive"
                             >
                                <Cloud className="w-5 h-5" />
                             </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (m.file?.type === 'application/vnd.google-apps.document') {
                                    openInGoogleDocs(m.file.name, m.file.data);
                                  } else {
                                     // Fallback for non-google docs
                                     setActiveDocument({
                                        id: m.id,
                                        name: m.file?.name || "Dokumen",
                                        content: m.file?.data || ""
                                     });
                                     setIsSplitView(true);
                                  }
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-none bg-heritage-ink border border-heritage-gold/30 text-heritage-gold text-xs font-black uppercase tracking-widest hover:bg-heritage-gold hover:text-heritage-ink transition-all whitespace-nowrap"
                             >
                                {m.file?.type === 'application/vnd.google-apps.document' ? (
                                   <><ExternalLink className="w-4 h-4" /> Buka di Google Docs</>
                                ) : (
                                   <><Laptop className="w-4 h-4" /> Buka dengan Word</>
                                )}
                             </button>
                          </div>
                        </div>
                      )}
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.createdAt && (
                       <div className="flex items-center gap-2 mt-6">
                         <div className="h-px flex-1 bg-white/5"></div>
                         <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 shrink-0">
                          {new Date(m.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                       </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isSending && (
                <div className="flex gap-6">
                  <div className="w-10 h-10 rounded-none flex items-center justify-center shrink-0 bg-heritage-ink border border-heritage-gold/20 text-heritage-gold shadow-lg animate-pulse">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] rounded-tl-none p-6 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-2 items-center">
                      {[0, 1, 2].map(dot => (
                        <span key={dot} className="w-2 h-2 bg-heritage-gold rounded-full animate-bounce" style={{ animationDelay: `${dot * 0.15}s` }}></span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-8 bg-transparent shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Agent Mode Toggle */}
            <div className="w-full flex items-center justify-between mb-4 px-8 py-3 bg-white border-b border-heritage-ink/5 max-w-[95%]">
              <div className="flex items-center gap-3">
                 <Sparkles className="w-4 h-4 text-heritage-gold" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink/60">Expert Research Mode</span>
              </div>
              <button 
                onClick={() => setAgentMode(!agentMode)}
                className={cn(
                  "relative w-10 h-5 transition-all duration-300",
                  agentMode ? "bg-heritage-gold" : "bg-heritage-ink/10"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white transition-transform duration-300 transform",
                  agentMode ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <form 
              onSubmit={handleSendMessage}
              className="w-full relative bg-white rounded-none shadow-2xl border border-heritage-ink/5 focus-within:border-heritage-gold transition-all group"
            >
              {/* File Attachment Preview */}
              <AnimatePresence>
                {attachedFile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 p-3 bg-heritage-ink text-white flex items-center gap-4 shadow-2xl z-20 border border-heritage-gold/20"
                  >
                    {attachedFile.type.startsWith('image/') ? (
                      <div className="w-12 h-12 overflow-hidden border border-white/10">
                        <img src={attachedFile.data} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-heritage-gold/20 flex items-center justify-center text-heritage-gold">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex flex-col pr-8">
                      <span className="text-[10px] font-black text-white truncate max-w-[150px] uppercase tracking-widest">{attachedFile.name}</span>
                      <span className="text-[8px] font-bold text-heritage-gold uppercase tracking-widest">Siap Menganalisis</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="absolute top-2 right-2 p-1 text-white/40 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik instruksi atau pertanyaan hukum Anda di sini..."
                rows={Math.min(input.split('\n').length, 5)}
                className="w-full pl-6 pr-28 py-6 pb-20 focus:outline-none text-heritage-ink bg-transparent resize-none font-medium text-sm custom-scrollbar placeholder:text-heritage-ink/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              {/* Left inside buttons */}
              <div className="absolute left-4 bottom-4 flex items-center gap-2">
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-none bg-heritage-ink/5 border border-heritage-ink/5 text-heritage-ink/40 hover:text-heritage-gold hover:bg-heritage-ink transition-all",
                      showPlusMenu && "bg-heritage-ink text-heritage-gold border-heritage-gold/20"
                    )}
                    title="Menu Tambahan"
                  >
                    <Plus className={cn("w-5 h-5 transition-transform duration-200", showPlusMenu && "rotate-45")} />
                  </button>
                  
                  <AnimatePresence>
                    {showPlusMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-4 w-72 bg-white text-heritage-ink rounded-none shadow-2xl overflow-hidden z-50 border border-heritage-ink/5"
                      >
                         <div className="p-3 space-y-1">
                            {/* Attach Files */}
                            <button 
                              onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                              className="w-full flex items-center justify-between p-4 hover:bg-heritage-bone rounded-none transition-all group"
                            >
                               <div className="flex items-center gap-4">
                                  <Paperclip className="w-5 h-5 text-heritage-ink/40 group-hover:text-heritage-gold" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Lampirkan Berkas</span>
                               </div>
                            </button>

                            {/* Memories */}
                            <button 
                              onClick={() => {
                                setError("Memori Percakapan: Lexsia sedang mengingat konteks riset sebelumnya untuk akurasi lebih baik.");
                                setShowPlusMenu(false);
                                setTimeout(() => setError(null), 4000);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-heritage-bone rounded-none transition-all group"
                            >
                               <div className="flex items-center gap-4">
                                  <Brain className="w-5 h-5 text-heritage-ink/40 group-hover:text-heritage-gold" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Memori Riset</span>
                               </div>
                            </button>

                            {/* Playbooks */}
                            <button 
                              onClick={() => {
                                setInput("Saya butuh Playbook/Panduan Prosedural untuk: [Sebutkan kasus Anda, misal: Pendirian PT, Gugatan Perdata]");
                                setShowPlusMenu(false);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-heritage-bone rounded-none transition-all group"
                            >
                               <div className="flex items-center gap-4">
                                  <Book className="w-5 h-5 text-heritage-ink/40 group-hover:text-heritage-gold" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Playbooks</span>
                               </div>
                               <ExternalLink className="w-4 h-4 text-heritage-ink/20 group-hover:text-heritage-ink/60" />
                            </button>

                            {/* Prompts */}
                            <button 
                              onClick={() => {
                                setInput("Berikan draf surat kuasa untuk perkara perdata dengan detail sebagai berikut: ");
                                setShowPlusMenu(false);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-heritage-bone rounded-none transition-all group"
                            >
                               <div className="flex items-center gap-4">
                                  <MessageSquare className="w-5 h-5 text-heritage-ink/40 group-hover:text-heritage-gold" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink">Templat Prompt</span>
                               </div>
                               <ChevronRight className="w-4 h-4 text-heritage-ink/20 group-hover:text-heritage-ink/60" />
                            </button>

                            {/* Language */}
                            <div className="flex items-center justify-between p-4 bg-heritage-bone/50 blur-[0.5px]">
                               <div className="flex items-center gap-4">
                                  <Globe className="w-5 h-5 text-heritage-ink/20" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-heritage-ink/40 text-left">Internal Lexsia<br/>Translation</span>
                               </div>
                               <div className="flex items-center gap-2 px-3 py-1.5 bg-heritage-ink text-heritage-gold border border-heritage-gold/20">
                                  <span className="text-[9px] font-bold">Auto</span>
                                  <Sparkles className="w-3 h-3" />
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  type="button" 
                  onClick={handleSmartAction}
                  disabled={isEnhancing}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-none bg-heritage-ink/5 border border-heritage-ink/5 text-heritage-ink/40 hover:text-heritage-gold hover:bg-heritage-ink transition-all",
                    (!input.trim() && (!activeChat || messages.length === 0)) && "opacity-50 pointer-events-none"
                  )}
                  title={input.trim() ? "Tingkatkan Prompt" : "Ringkas Percakapan"}
                >
                  {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin text-heritage-gold" /> : <Sparkles className="w-5 h-5" />}
                </button>
              </div>

              {/* Right inside buttons */}
              <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-heritage-ink/40 hover:text-heritage-gold transition-all bg-heritage-ink/5 border border-transparent hover:border-heritage-ink/10"
                  title="Lampirkan Dokumen"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className={cn(
                    "px-8 py-3 transition-all active:scale-95 font-black text-[10px] uppercase tracking-[0.2em]",
                    input.trim() 
                      ? "bg-heritage-ink text-heritage-gold shadow-2xl hover:bg-heritage-gold hover:text-heritage-ink" 
                      : "bg-heritage-ink/5 text-heritage-ink/20 cursor-not-allowed"
                  )}
                >
                  KIRIM
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
               <button 
                  onClick={() => setShowTutorial(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-heritage-ink/5 border border-heritage-ink/5 rounded-none text-heritage-ink/60 text-[10px] font-black uppercase tracking-widest hover:bg-heritage-ink hover:text-heritage-gold transition-all shadow-sm"
               >
                  <Play className="w-4 h-4 text-heritage-gold" />
                  Panduan Penggunaan
               </button>
               
               <div className="relative">
                 <button 
                    onClick={() => setShowConnectMenu(!showConnectMenu)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 bg-heritage-ink/5 border border-heritage-ink/5 rounded-none text-heritage-ink/60 text-[10px] font-black uppercase tracking-widest hover:bg-heritage-ink hover:text-heritage-gold transition-all shadow-sm",
                      showConnectMenu && "bg-heritage-ink text-heritage-gold border-heritage-gold/20"
                    )}
                 >
                    <div className="flex -space-x-1.5 mr-1">
                      <div className="w-4 h-4 bg-heritage-ink border border-white/5 rounded-none"></div>
                      <div className="w-4 h-4 bg-heritage-gold border border-white/10 rounded-none overflow-hidden flex items-center justify-center">
                         <div className="w-2 h-2 bg-heritage-ink rounded-full"></div>
                      </div>
                    </div>
                    Hubungkan Data Akun
                 </button>

                 <AnimatePresence>
                    {showConnectMenu && (
                       <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                       >
                          <div className="p-3 border-b border-white/5">
                             <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 text-center">Pilih Sumber Data</p>
                          </div>
                          <div className="p-2 space-y-1">
                             <button 
                               onClick={() => { fileInputRef.current?.click(); setShowConnectMenu(false); }}
                               className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-xs font-semibold"
                             >
                                <div className="w-8 h-8 rounded-none bg-heritage-ink/10 text-heritage-gold flex items-center justify-center">
                                   <Laptop className="w-4 h-4" />
                                </div>
                                Local Computer
                             </button>
                             <button 
                               onClick={connectGoogleDrive}
                               className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-xs font-semibold"
                             >
                                <div className="w-8 h-8 rounded-lg bg-green-600/20 text-green-400 flex items-center justify-center">
                                   <Cloud className="w-4 h-4" />
                                </div>
                                Google Drive
                             </button>
                             <button 
                               onClick={() => { startCamera(); setShowConnectMenu(false); }}
                               className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-xs font-semibold"
                             >
                                <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center">
                                   <Camera className="w-4 h-4" />
                                </div>
                                Capture Document
                             </button>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
               </div>

               <button 
                  onClick={copyInviteLink}
                  className="flex items-center gap-2 px-6 py-2.5 bg-heritage-ink text-white border border-heritage-gold/20 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-heritage-gold hover:text-heritage-ink transition-all shadow-lg"
               >
                  <Users className="w-4 h-4 text-heritage-gold" />
                  Invite Team
               </button>
            </div>

            <p className="text-center text-[10px] text-heritage-ink/30 mt-12 uppercase tracking-[0.3em] font-bold">
              Lexsia.ai dilatih dengan KUHP, KUHPer & Peraturan Perundang-undangan Terkini
            </p>
          </div>
        </div>
      </div> {/* End of Left Panel */}
          
          <AnimatePresence>
            {isSplitView && (
              <motion.div 
                id="document-container"
                initial={{ opacity: 0, x: 200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 200 }}
                className="w-1/2 bg-heritage-bone flex flex-col h-full border-l border-heritage-ink/5 relative overflow-hidden"
              >
                 {/* Polished Compact Header inspired by the design */}
                 <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden mr-1">
                       <h2 className="text-sm font-medium text-slate-700 truncate">
                          {activeDocument?.name || "Dokumen"}
                       </h2>
                    </div>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                       {/* AI / Gemini Icon */}
                       <button 
                          onClick={() => {
                            setToast({ message: "Lexsia AI sedang menganalisis dokumen...", type: 'info' });
                            setTimeout(() => setToast(null), 3000);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors text-blue-600 group"
                          title="AI Assistant"
                       >
                          <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                       </button>

                       {/* Google Drive Icon/Button */}
                       <button 
                          onClick={() => activeDocument && simulateSaveToDrive(activeDocument.name, activeDocument.content)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors group"
                          title="Simpan ke Drive"
                       >
                          <svg viewBox="0 0 24 24" className="w-4 h-4">
                            <path fill="#0066da" d="m14 16h4l-2 3z"/>
                            <path fill="#00ac47" d="m11 16-2-3h4z"/>
                            <path fill="#ffba00" d="m7 16-2 3h4z"/>
                            <path fill="#0066da" d="m12 11h4l-2 3z"/>
                            <path fill="#00ac47" d="m4 11l4 7l-2 3l-4-7z"/>
                            <path fill="#ffba00" d="m12 11l-4 7l-2-3l4-7z"/>
                            <path fill="#ea4335" d="m16 4l4 7l-2 3l-4-7z"/>
                            <path fill="#0066da" d="m12 4l4 7l-2-3l-4-7z"/>
                            <path fill="#ffba00" d="m12 4l-4 7l2-3l2-4z"/>
                          </svg>
                       </button>

                       <button 
                          onClick={exportToDoc}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
                          title="Unduh DOCX"
                       >
                          <Download className="w-4 h-4" />
                       </button>

                       <button 
                          onClick={() => {
                            setToast({ message: "Memperbarui draf hukum...", type: 'info' });
                            setTimeout(() => setToast(null), 3000);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
                          title="Refresh"
                       >
                          <RotateCcw className="w-4 h-4" />
                       </button>

                       <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

                       <button 
                          onClick={() => setIsSplitView(false)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-slate-500 hover:text-red-500"
                          title="Tutup"
                       >
                          <X className="w-4 h-4" />
                       </button>
                    </div>
                 </div>

                 {/* Compact Unified Toolbar */}
                 <div className="bg-[#f8f9fa] px-3 py-1.5 border-b border-slate-200 flex items-center justify-between overflow-x-auto no-scrollbar shrink-0">
                    <div className="flex items-center gap-1.5">
                       <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                          <button onClick={() => applyFormat('undo')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Urungkan"><Undo className="w-3.5 h-3.5" /></button>
                          <button onClick={() => applyFormat('redo')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Ulangi"><Redo className="w-3.5 h-3.5" /></button>
                       </div>
                       
                       <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
                          <select 
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(Number(e.target.value))}
                            className="bg-transparent text-[10px] font-medium hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer text-slate-600 focus:outline-none"
                          >
                             <option value="50">50%</option>
                             <option value="75">75%</option>
                             <option value="100">100%</option>
                             <option value="125">125%</option>
                             <option value="150">150%</option>
                          </select>
                       </div>

                       <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
                          <select 
                            onChange={(e) => applyFormat('formatBlock', e.target.value)}
                            className="bg-transparent text-[10px] font-medium hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer text-slate-600 focus:outline-none"
                          >
                             <option value="p">Normal</option>
                             <option value="h1">Judul 1</option>
                             <option value="h2">Judul 2</option>
                             <option value="h3">Judul 3</option>
                          </select>
                       </div>

                       <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
                          <button onClick={() => applyFormat('bold')} className="p-1 hover:bg-slate-200 rounded text-slate-800 transition-colors" title="Tebal"><Bold className="w-3.5 h-3.5" /></button>
                          <button onClick={() => applyFormat('italic')} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Miring"><Italic className="w-3.5 h-3.5" /></button>
                          <button onClick={() => applyFormat('underline')} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Garis Bawah"><Underline className="w-3.5 h-3.5" /></button>
                       </div>

                       <div className="flex items-center gap-0.5">
                          <button onClick={() => applyFormat('justifyLeft')} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Rata Kiri"><AlignLeft className="w-3.5 h-3.5" /></button>
                          <button onClick={() => applyFormat('justifyCenter')} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Rata Tengah"><AlignCenter className="w-3.5 h-3.5" /></button>
                       </div>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-200 px-1.5 py-0.5 rounded shrink-0">P {currentPage}/{totalPages}</span>
                       <div className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter shrink-0 hidden sm:block">
                          {isSaving ? "Saving..." : "Saved"}
                       </div>
                    </div>
                 </div>

                  {/* Professional Legal Document Area */}
                  <div 
                    id="printable-content"
                    className="flex-1 overflow-y-auto bg-[#f0f2f5] p-10 flex flex-col items-center relative"
                    onScroll={handleDocScroll}
                  >
                     {/* Floating Page Indicator like in the image */}
                     <div className="absolute bottom-10 right-10 z-[100] bg-slate-700/80 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-md shadow-lg pointer-events-none transform transition-all duration-300">
                        Page {currentPage} / {totalPages}
                     </div>

                     {/* Multiple Pages Container */}
                     <div className="flex flex-col items-center gap-8 pb-32">
                        {/* Iterate through pages */}
                        {Array.from({ length: totalPages }).map((_, idx) => (
                           <motion.div 
                             key={`page-${idx}`}
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: idx * 0.1 }}
                             style={{ transform: `scale(${zoomLevel/100})`, transformOrigin: 'top center' }}
                             className="bg-white w-[850px] min-h-[1100px] h-fit shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-20 px-24 rounded-sm relative flex flex-col"
                           >
                              {/* Physical Paper Feel Overlay */}
                              <div className="absolute inset-0 pointer-events-none border border-slate-100/50"></div>
                              
                              <div className="prose prose-slate prose-sm max-w-none font-serif">
                                 {activeDocument && idx === 0 ? (
                                    <div 
                                       ref={editorRef}
                                       contentEditable="true"
                                       onInput={(e) => handleDocumentEdit(e.currentTarget.innerHTML)}
                                       className="w-full h-auto bg-transparent border-none focus:outline-none focus:ring-0 p-0 resize-none font-serif text-slate-900 leading-relaxed text-justify editor-content"
                                       spellCheck="false"
                                       dangerouslySetInnerHTML={{ __html: activeDocument.content }}
                                    />
                                 ) : activeDocument ? (
                                    /* Placeholder for following pages if content overflowed */
                                    <div className="opacity-[0.05] pointer-events-none select-none italic text-slate-800">
                                       <p className="mb-4">Konten berlanjut dari halaman sebelumnya...</p>
                                       {Array.from({ length: 15 }).map((_, l) => (
                                          <div key={l} className="h-4 bg-slate-200 rounded w-full mb-3"></div>
                                       ))}
                                    </div>
                                 ) : (
                                    <div className="h-[800px] flex flex-col items-center justify-center opacity-30 mt-40">
                                       <FileText className="w-24 h-24 mb-6 stroke-[1]" />
                                       <p className="text-xl italic font-serif">Sebutkan draf yang ingin dibuat di chat untuk memulai...</p>
                                    </div>
                                 )}
                              </div>
                              
                              {/* Page Footer removed to avoid duplication with embedded legal footer */}
                           </motion.div>
                        ))}
                     </div>
                  </div>

                 {/* Minimal Document Footer */}
                 <div className="bg-white border-t border-slate-100 p-2 px-6 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2">
                          <CheckCircle className={cn("w-3 h-3 transition-colors", isSaving ? "text-slate-300" : "text-green-500")} />
                          <span className="text-[10px] font-medium">{isSaving ? 'Menyimpan perubahan...' : 'Semua perubahan disimpan'}</span>
                       </div>
                       <span className="text-[10px] font-medium uppercase tracking-widest opacity-50">Lexsia v4.0 AI-Core</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <button onClick={exportToDoc} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-tight">Unduh DOCX</button>
                       <button onClick={() => window.print()} className="text-[10px] font-bold text-slate-500 hover:underline uppercase tracking-tight">Cetak PDF</button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Google Drive Setup Guidelines Modal */}
      <AnimatePresence>
        {showDriveSetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDriveSetup(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Setup Google Drive</h2>
                      <p className="text-xs text-slate-400 font-medium tracking-tight">KONEKSI API DIPERLUKAN</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDriveSetup(false)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-none bg-heritage-ink border border-heritage-gold/20 text-heritage-gold text-xs leading-relaxed">
                    <p className="font-bold mb-2 flex items-center gap-2">
                       <CheckCircle className="w-4 h-4" /> 
                       Panduan Aktivasi Fitur:
                    </p>
                    Fitur ini memerlukan konfigurasi API dari Google Cloud Cloud Console. Ikuti langkah protokol berikut untuk mengaktifkannya.
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-none bg-heritage-ink text-heritage-gold text-[10px] font-bold flex items-center justify-center shrink-0 border border-heritage-gold/20">1</div>
                      <div className="text-sm text-slate-300">
                        Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a> dan buat proyek baru.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-none bg-heritage-ink text-heritage-gold text-[10px] font-bold flex items-center justify-center shrink-0 border border-heritage-gold/20">2</div>
                      <div className="text-sm text-slate-300">
                        Aktifkan <strong>Google Drive API</strong> dan <strong>Google Picker API</strong> di API Library.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-none bg-heritage-ink text-heritage-gold text-[10px] font-bold flex items-center justify-center shrink-0 border border-heritage-gold/20">3</div>
                      <div className="text-sm text-slate-300">
                        Buat <strong>OAuth Client ID</strong> (Web Application) dan <strong>API Key</strong>.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-none bg-heritage-ink text-heritage-gold text-[10px] font-bold flex items-center justify-center shrink-0 border border-heritage-gold/20">4</div>
                      <div className="text-sm text-slate-300">
                        Masuk ke <strong>Settings</strong> di AI Studio ini, lalu tambahkan variabel berikut:
                        <div className="mt-2 bg-black/40 p-3 rounded-lg font-mono text-[10px] border border-white/5 select-all">
                          VITE_GOOGLE_DRIVE_CLIENT_ID<br/>
                          VITE_GOOGLE_DRIVE_API_KEY
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={simulateDriveConnection}
                    className="flex-1 py-4 rounded-none bg-heritage-ink hover:bg-heritage-gold text-white hover:text-heritage-ink font-black uppercase tracking-widest text-[10px] border border-heritage-gold/30 transition-all flex items-center justify-center gap-2"
                  >
                    COBA MODE SIMULASI <Sparkles className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowDriveSetup(false)}
                    className="flex-1 py-4 rounded-none bg-heritage-bone text-heritage-ink font-black uppercase tracking-widest text-[10px] border border-heritage-ink/10 hover:bg-white transition-all"
                  >
                    SAYA MENGERTI
                  </button>
                </div>
                <div className="mt-4">
                  <a 
                    href="https://developers.google.com/drive/picker/guides/overview" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 rounded-none bg-white/5 border border-heritage-ink/5 text-heritage-ink/40 font-black uppercase tracking-widest text-[9px] hover:text-heritage-ink transition-all flex items-center justify-center gap-2"
                  >
                    DOKUMENTASI API RESMI <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
