import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, MapPin, Users, QrCode, Search, 
  Trash2, ChevronLeft, Share2, Mail, MessageCircle, Sparkles, CheckCircle, 
  X, Menu, Bell, Home, CheckSquare, Clock, ScanLine, Settings, Shield, User, Briefcase, LogOut
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Scanner from './components/Scanner';
import Login from './components/Login';
import { Event, Guest, ViewState, QRCodePayload, Reminder, User as AppUser, AuthUser } from './types';
import * as Storage from './services/supabaseStorageService';
import * as GeminiService from './services/geminiService';
import { parseExcelGuests } from './services/excelUtils';
import { getCurrentUser, onAuthStateChange, signOut } from './services/authService';
import * as SupabaseStorage from './services/supabaseStorage';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';

// --- Helper Components ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<Guest | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'idle', message: string }>({ status: 'idle', message: '' });

  // Form States
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ attractions: [], gallery: [] });
  const [newGuest, setNewGuest] = useState<Partial<Guest> & { targetEventId?: string }>({});
  const [newReminder, setNewReminder] = useState<{ text: string; date: string }>({ text: '', date: '' });
  const [newUser, setNewUser] = useState<Partial<AppUser>>({ role: 'STAFF' });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ticketImage, setTicketImage] = useState<string | null>(null);
  const [publicTicketData, setPublicTicketData] = useState<{ guest: Guest, event: Event } | null>(null);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  // Check authentication state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const ticketId = urlParams.get('ticket');

      try {
        const user = await getCurrentUser();
        
        if (user) {
          setAuthUser(user);
          setIsAuthenticated(true);
          // Only change view if NOT loading a public ticket
          if (!ticketId) {
            setView('DASHBOARD');
            await loadInitialData();
          } else {
            // Even if logged in, we still need initial data for other things
            await loadInitialData();
          }
        } else {
          setAuthUser(null);
          setIsAuthenticated(false);
          // Only change to LOGIN if NOT loading a public ticket
          if (!ticketId) {
            setView('LOGIN');
          }
        }
      } catch (error) {
        setAuthUser(null);
        setIsAuthenticated(false);
        if (!ticketId) {
          setView('LOGIN');
        }
      }
    };
    
    checkAuth();
    
    // Check for public ticket link
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket');
    if (ticketId) {
      handleLoadPublicTicket(ticketId);
    }
    
    // Listen for auth changes
    try {
      const { data: { subscription } } = onAuthStateChange((user) => {
        if (user) {
          setAuthUser(user);
          setIsAuthenticated(true);
          // Only redirect to Dashboard if we are NOT in public ticket view
          if (view !== 'PUBLIC_TICKET') {
            setView('DASHBOARD');
            loadInitialData();
          }
        } else {
          setAuthUser(null);
          setIsAuthenticated(false);
          if (view !== 'PUBLIC_TICKET') {
            setView('LOGIN');
          }
        }
      });
      
      return () => subscription?.unsubscribe();
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }
  }, []);

  const handleLoadPublicTicket = async (id: string) => {
    setIsLoadingPublic(true);
    setView('PUBLIC_TICKET');
    try {
      const guestData = await Storage.getGuestById(id);
      if (guestData) {
        const eventData = await Storage.getEventById(guestData.eventId);
        if (eventData) {
          setPublicTicketData({ guest: guestData, event: eventData });
        } else {
          alert('Evento não encontrado para este ticket.');
          setView('LOGIN');
        }
      } else {
        alert('Ticket não encontrado ou inválido.');
        setView('LOGIN');
      }
    } catch (error) {
      console.error('Error loading public ticket:', error);
      alert('Erro ao carregar o ticket. Verifique sua conexão.');
      setView('LOGIN');
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [eventsData, remindersData, usersData] = await Promise.all([
        Storage.getEvents(),
        Storage.getReminders(),
        Storage.getUsers()
      ]);
      setEvents(eventsData);
      setReminders(remindersData);
      setUsers(usersData);
      if (usersData.length > 0) {
        setCurrentUser(usersData[0]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setView('DASHBOARD');
    loadInitialData();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setIsAuthenticated(false);
      setView('LOGIN');
      // Clear all data
      setEvents([]);
      setGuests([]);
      setReminders([]);
      setUsers([]);
      setSelectedEvent(null);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Update guest list based on context
  useEffect(() => {
    const loadGuests = async () => {
      try {
        if (view === 'EVENT_DETAILS' && selectedEvent) {
          const guestsData = await Storage.getGuestsByEventId(selectedEvent.id);
          setGuests(guestsData);
        } else if (view === 'GUESTS') {
          const guestsData = await Storage.getAllGuests();
          setGuests(guestsData);
        }
      } catch (error) {
        console.error('Error loading guests:', error);
      }
    };
    loadGuests();
  }, [view, selectedEvent, events]);

  // --- Actions ---

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name && !newEvent.location && !newEvent.description) {
       alert("Por favor, preencha pelo menos o nome ou descrição do evento.");
       return;
    }

    const event: Event = {
      id: newEvent.id || crypto.randomUUID(),
      name: newEvent.name,
      date: newEvent.date,
      location: newEvent.location,
      description: newEvent.description || '',
      imageUrl: newEvent.imageUrl || `https://picsum.photos/seed/${newEvent.name}/800/400`,
      attractions: newEvent.attractions || [],
      gallery: newEvent.gallery || []
    };

    try {
      await Storage.saveEvent(event);
      const eventsData = await Storage.getEvents();
      setEvents(eventsData);
      setShowEventModal(false);
      setNewEvent({ attractions: [], gallery: [] });
      
      if (!newEvent.id) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#7c3aed', '#10b981']
        });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Erro ao salvar evento. Tente novamente.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await SupabaseStorage.uploadEventImage(file);
      setNewEvent(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!newEvent.name || !newEvent.location) return;
    setIsGeneratingAI(true);
    const desc = await GeminiService.generateEventDescription(newEvent.name, newEvent.location);
    setNewEvent(prev => ({ ...prev, description: desc }));
    setIsGeneratingAI(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetEventId = selectedEvent?.id || newGuest.targetEventId;
    
    if (!file || !targetEventId) return;

    try {
      const parsedGuests = await parseExcelGuests(file, targetEventId);
      if (parsedGuests.length > 0) {
        await Storage.saveGuests(parsedGuests as Guest[]);
        // Refresh lists
        if (view === 'EVENT_DETAILS' && selectedEvent) {
          const guestsData = await Storage.getGuestsByEventId(selectedEvent.id);
          setGuests(guestsData);
        } else {
          const guestsData = await Storage.getAllGuests();
          setGuests(guestsData);
        }
        alert(`${parsedGuests.length} convidados importados com sucesso!`);
      } else {
        alert("Nenhum convidado encontrado na planilha. Verifique se há colunas com Nome/CPF/Telefone.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao ler a planilha. Certifique-se de que é um arquivo .xlsx ou .xls válido.");
    }
  };

  const shareEventWhatsApp = (event: Event) => {
    const message = `🎉 Convite Especial: ${event.name}\n📅 Data: ${new Date(event.date).toLocaleDateString()}\n📍 Local: ${event.location}\n\nEspero por você!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const shareEventEmail = (event: Event) => {
    const subject = `Convite: ${event.name}`;
    const body = `Olá!\n\nVocê está convidado para o evento ${event.name}.\n\nData: ${new Date(event.date).toLocaleDateString()}\nLocal: ${event.location}\nDescrição: ${event.description}\n\nNos vemos lá!`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Tem certeza? Isso removerá todos os convidados associados a este evento.')) {
      try {
        await Storage.deleteEvent(id);
        const eventsData = await Storage.getEvents();
        setEvents(eventsData);
        if (selectedEvent?.id === id) {
          setSelectedEvent(null);
          setView('DASHBOARD');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Erro ao deletar evento. Tente novamente.');
      }
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    // Determine target event: either from selectedEvent (Event Details view) or selected dropdown (Guests view)
    const targetEventId = selectedEvent?.id || newGuest.targetEventId;

    if (!targetEventId || !newGuest.name || !newGuest.cpf || !newGuest.phone) {
      alert("Por favor, preencha todos os campos obrigatórios e selecione um evento.");
      return;
    }

    const guestId = newGuest.id || crypto.randomUUID();
    const qrPayload: QRCodePayload = {
      eventId: targetEventId,
      guestId: guestId,
      valid: true
    };

    const guest: Guest = {
      id: guestId,
      eventId: targetEventId,
      name: newGuest.name,
      cpf: newGuest.cpf,
      phone: newGuest.phone,
      email: newGuest.email || '',
      checkedIn: newGuest.checkedIn || false,
      qrCodeData: newGuest.qrCodeData || JSON.stringify(qrPayload),
    };

    try {
      await Storage.saveGuest(guest);
      
      // Refresh lists
      if (view === 'EVENT_DETAILS' && selectedEvent) {
         const guestsData = await Storage.getGuestsByEventId(selectedEvent.id);
         setGuests(guestsData);
      } else {
         const guestsData = await Storage.getAllGuests();
         setGuests(guestsData);
      }

      setShowGuestModal(false);
      setNewGuest({});
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('Erro ao salvar convidado. Tente novamente.');
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este convidado?')) {
      try {
        await Storage.deleteGuest(id);
        
        // Refresh lists
        if (view === 'EVENT_DETAILS' && selectedEvent) {
           const guestsData = await Storage.getGuestsByEventId(selectedEvent.id);
           setGuests(guestsData);
        } else {
           const guestsData = await Storage.getAllGuests();
           setGuests(guestsData);
        }
      } catch (error) {
        console.error('Error deleting guest:', error);
        alert('Erro ao excluir convidado.');
      }
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.text) return;

    const reminder: Reminder = {
      id: crypto.randomUUID(),
      text: newReminder.text,
      date: newReminder.date || new Date().toISOString().split('T')[0],
      completed: false
    };

    try {
      await Storage.saveReminder(reminder);
      const remindersData = await Storage.getReminders();
      setReminders(remindersData);
      setNewReminder({ text: '', date: '' });
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Erro ao salvar lembrete. Tente novamente.');
    }
  };

  const toggleReminder = async (id: string) => {
    try {
      await Storage.toggleReminder(id);
      const remindersData = await Storage.getReminders();
      setReminders(remindersData);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await Storage.deleteReminder(id);
      const remindersData = await Storage.getReminders();
      setReminders(remindersData);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.role || !newUser.contact) return;

    const user: AppUser = {
      id: crypto.randomUUID(),
      name: newUser.name,
      role: newUser.role as 'ADMIN' | 'STAFF',
      contact: newUser.contact
    };

    try {
      await Storage.saveUser(user);
      const usersData = await Storage.getUsers();
      setUsers(usersData);
      setNewUser({ role: 'STAFF', name: '', contact: '' });
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário. Tente novamente.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Remover este membro da equipe?')) {
      try {
        await Storage.deleteUser(id);
        const usersData = await Storage.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Erro ao deletar usuário. Tente novamente.');
      }
    }
  };

  const handleScan = async (payload: QRCodePayload) => {
    if (!payload.eventId || !payload.guestId) {
        setScanResult({ status: 'error', message: 'QR Code Inválido' });
        setTimeout(() => setScanResult({ status: 'idle', message: '' }), 3000);
        return;
    }

    try {
      // Fetch fresh data for global scan context
      const allGuests = await Storage.getAllGuests();
      const guest = allGuests.find(g => g.id === payload.guestId);

      if (!guest) {
          setScanResult({ status: 'error', message: 'QR Code Inválido' }); // Guest not found
          setTimeout(() => setScanResult({ status: 'idle', message: '' }), 3000);
          return;
      }

      // Verify Ticket belongs to correct event
      if (guest.eventId !== payload.eventId) {
          setScanResult({ status: 'error', message: 'QR Code Inválido' }); // Event mismatch
          setTimeout(() => setScanResult({ status: 'idle', message: '' }), 3000);
          return;
      }

      // Perform Check-in
      const success = await Storage.checkInGuest(guest.id, currentUser?.name, 'QR');
      const event = events.find(e => e.id === guest.eventId);

      if (success) {
        setScanResult({ status: 'success', message: 'OK' });
        
        // Update local state if needed
        if (view === 'GUESTS') {
            const guestsData = await Storage.getAllGuests();
            setGuests(guestsData);
        }
        if (selectedEvent?.id === guest.eventId) {
            const guestsData = await Storage.getGuestsByEventId(guest.eventId);
            setGuests(guestsData);
        }

      } else {
        if (guest.checkedIn) {
           setScanResult({ status: 'error', message: `Já Liberado por ${guest.authorizedBy || 'Sistema'}` });
        } else {
           setScanResult({ status: 'error', message: 'Falha no Check-in' });
        }
      }
      setTimeout(() => setScanResult({ status: 'idle', message: '' }), 3000);
    } catch (error) {
      console.error('Error during scan:', error);
      setScanResult({ status: 'error', message: 'Erro no processo' });
      setTimeout(() => setScanResult({ status: 'idle', message: '' }), 3000);
    }
  };

  const handleShareTicket = async (guest: Guest) => {
    // We now use the public link strategy for better compatibility
    const publicLink = `${window.location.origin}/?ticket=${guest.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Seu Ticket - EventMaster AI',
          text: `Olá ${guest.name}! Aqui está o seu ingresso para o evento:`,
          url: publicLink
        });
      } catch (err) {
        console.error('Error sharing link:', err);
        // Fallback to clipboard
        copyToClipboard(publicLink);
      }
    } else {
      copyToClipboard(publicLink);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link do ticket copiado para a área de transferência! Envie para o convidado.');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert(`Link do ticket: ${text}`);
    });
  };

  const sendEmail = (guest: Guest) => {
    const event = events.find(e => e.id === guest.eventId);
    if (!event) return;
    const subject = `Seu Ticket: ${event.name}`;
    const body = `Olá ${guest.name},\n\nSua inscrição para o evento ${event.name} em ${event.location} foi confirmada.\nData: ${new Date(event.date).toLocaleDateString()}\n\nID do Ticket: ${guest.id}`;
    const url = `mailto:${guest.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Eventos</h1>
          <p className="text-slate-500 mt-1">Gerencie seus eventos e convidados.</p>
        </div>
        <button 
          onClick={() => { setNewEvent({ attractions: [], gallery: [] }); setShowEventModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={20} /> Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Calendar className="mx-auto w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum evento encontrado. Crie seu primeiro evento!</p>
          </div>
        )}
        {events.map(event => (
          <div key={event.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden flex flex-col">
            <div className="h-32 bg-slate-100 relative">
              <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <h3 className="text-white font-bold text-lg leading-tight truncate">{event.name}</h3>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-500" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-4">
                <button 
                  onClick={() => { setSelectedEvent(event); setView('EVENT_DETAILS'); }}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Gerenciar
                </button>
                <button 
                  onClick={() => { setNewEvent(event); setShowEventModal(true); }}
                  className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Briefcase size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGuests = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Todos os Convidados</h1>
          <p className="text-slate-500 mt-1">Registro global de todos os participantes.</p>
        </div>
        <div className="flex gap-2">
          <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm cursor-pointer transition-all">
            <ScanLine size={20} /> Importar Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
          </label>
          <button 
            onClick={() => { setSelectedEvent(null); setNewGuest({}); setShowGuestModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} /> Cadastrar Convidado
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Evento</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Nenhum convidado registrado no sistema.
                  </td>
                </tr>
              )}
              {guests.map(guest => {
                const eventName = events.find(e => e.id === guest.eventId)?.name || 'Unknown Event';
                return (
                  <tr key={guest.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{guest.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{guest.cpf}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                        {eventName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{guest.phone}</td>
                    <td className="px-6 py-4">
                      {guest.checkedIn ? (
                        <div className="flex flex-col">
                          <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> Liberado
                          </span>
                          <span className="text-[10px] text-slate-400">
                             {guest.checkInMethod === 'QR' ? 'via QR' : 'Manual'} por {guest.authorizedBy || 'Sistema'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs flex items-center gap-1 italic">
                          <Clock size={12} /> Aguardando
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-slate-400">
                        <button onClick={() => setShowQRModal(guest)} className="p-1 hover:text-indigo-600 transition-colors" title="Ver Ticket">
                          <QrCode size={18} />
                        </button>
                        <button onClick={() => { setNewGuest(guest); setShowGuestModal(true); }} className="p-1 hover:text-indigo-600 transition-colors" title="Editar Convidado">
                          <Settings size={18} />
                        </button>
                        <button onClick={() => handleDeleteGuest(guest.id)} className="p-1 hover:text-red-600 transition-colors" title="Excluir Convidado">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReminders = () => (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Lembretes</h1>
      
      {/* Add Reminder Form */}
      <form onSubmit={handleAddReminder} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Nova Tarefa</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ex: Enviar convites..."
            value={newReminder.text}
            onChange={e => setNewReminder({ ...newReminder, text: e.target.value })}
          />
        </div>
        <div className="w-40">
           <label className="block text-xs font-medium text-slate-500 mb-1">Data Prazo</label>
           <input 
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newReminder.date}
            onChange={e => setNewReminder({ ...newReminder, date: e.target.value })}
           />
        </div>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors h-[42px]">
          Adicionar
        </button>
      </form>

      {/* Reminder List */}
      <div className="space-y-3">
        {reminders.length === 0 && (
          <div className="text-center py-10 text-slate-400 italic">Nenhum lembrete ainda. Organize-se!</div>
        )}
        {reminders.map(reminder => (
          <div key={reminder.id} className={`flex items-center gap-3 p-4 bg-white rounded-xl border transition-all ${reminder.completed ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm'}`}>
            <button 
              onClick={() => toggleReminder(reminder.id)}
              className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${reminder.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-indigo-500 text-transparent'}`}
            >
              <CheckSquare size={14} />
            </button>
            <div className="flex-1">
              <p className={`text-sm font-medium ${reminder.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{reminder.text}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Clock size={12} />
                <span>{reminder.date || 'Sem data'}</span>
              </div>
            </div>
            <button onClick={() => deleteReminder(reminder.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Excluir Lembrete">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie a equipe e permissões do sistema.</p>
      </div>

      {/* Add User Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
          <Plus size={18} /> Cadastrar Membro
        </h2>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ex: Maria Silva"
              value={newUser.name || ''}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Função</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value as 'ADMIN' | 'STAFF' })}
            >
              <option value="STAFF">Contratado</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="md:col-span-3">
             <label className="block text-xs font-medium text-slate-500 mb-1">Contato/Email</label>
             <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Contato"
              value={newUser.contact || ''}
              onChange={e => setNewUser({ ...newUser, contact: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg font-medium transition-colors h-[42px]"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Equipe Registrada</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {users.length === 0 ? (
             <div className="p-8 text-center text-slate-400 italic">Nenhum membro cadastrado.</div>
          ) : (
             <div className="divide-y divide-slate-100">
               {users.map(user => (
                 <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'ADMIN' ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                        {user.role === 'ADMIN' ? <Shield size={18} /> : <Briefcase size={18} />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.contact}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                         user.role === 'ADMIN' 
                         ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                         : 'bg-slate-100 text-slate-600 border-slate-200'
                       }`}>
                         {user.role === 'ADMIN' ? 'Administrador' : 'Contratado'}
                       </span>
                       <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                         <Trash2 size={18} />
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEventDetails = () => {
    if (!selectedEvent) return null;
    const checkedInCount = guests.filter(g => g.checkedIn).length;
    const totalGuests = guests.length;
    const progress = totalGuests === 0 ? 0 : (checkedInCount / totalGuests) * 100;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <div>
                <h2 className="font-bold text-lg text-slate-900 leading-none">{selectedEvent.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{new Date(selectedEvent.date).toLocaleDateString()} • {selectedEvent.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => shareEventWhatsApp(selectedEvent)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Compartilhar via WhatsApp">
                <MessageCircle size={20} />
              </button>
              <button onClick={() => shareEventEmail(selectedEvent)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Compartilhar via Email">
                <Mail size={20} />
              </button>
              <button 
                onClick={() => setView('SCANNER')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm ml-2"
              >
                <QrCode size={18} />
                <span className="hidden sm:inline">Check-in</span>
              </button>
            </div>
          </div>
          {/* Stats */}
          <div className="bg-slate-50 px-6 py-2 border-b border-slate-200">
             <div className="max-w-7xl mx-auto flex items-center gap-6 text-sm">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">Presença</span>
                    <span className="text-slate-500">{checkedInCount} / {totalGuests}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-slate-400" /> Lista de Convidados
            </h3>
            <div className="flex gap-2">
              <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm cursor-pointer transition-all">
                <ScanLine size={16} /> Importar Excel
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
              </label>
              <button 
                onClick={() => { setNewGuest({}); setShowGuestModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Convidado
              </button>
            </div>
          </div>

          {/* Attractions & Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm"><Sparkles size={16} className="text-indigo-500"/> Atrações</h4>
               {selectedEvent.attractions && selectedEvent.attractions.length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {selectedEvent.attractions.map((a, i) => (
                     <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs border border-indigo-100">{a}</span>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-slate-400 italic">Nenhuma atração cadastrada.</p>
               )}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm"><Home size={16} className="text-indigo-500"/> Galeria</h4>
               {selectedEvent.gallery && selectedEvent.gallery.length > 0 ? (
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                   {selectedEvent.gallery.map((img, i) => (
                     <img key={i} src={img} alt={`Gallery ${i}`} className="w-16 h-16 object-cover rounded-lg border border-slate-100 flex-shrink-0" />
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-slate-400 italic">Nenhuma imagem na galeria.</p>
               )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Convidado</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        Nenhum convidado registrado ainda.
                      </td>
                    </tr>
                  )}
                  {guests.map(guest => (
                    <tr key={guest.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{guest.name}</div>
                        <div className="text-xs text-slate-400">CPF: {guest.cpf}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{guest.phone}</div>
                        <div className="text-xs text-slate-400">{guest.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {guest.checkedIn ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle size={12} /> Liberado
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 ml-1">
                               {guest.checkInMethod === 'QR' ? 'via QR' : 'Manual'} por {guest.authorizedBy || 'Sistema'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                           <button onClick={() => setShowQRModal(guest)} className="p-1 hover:text-indigo-600 transition-colors" title="Ver Ticket">
                             <QrCode size={18} />
                           </button>
                           <button 
                             onClick={() => {
                               const publicLink = `${window.location.origin}/?ticket=${guest.id}`;
                               const msg = `Olá ${guest.name}, seu ticket para o evento está disponível! Link: ${publicLink}`;
                               window.open(`https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                             }} 
                             className="p-1 hover:text-green-600 transition-colors" 
                             title="Enviar WhatsApp"
                           >
                             <MessageCircle size={18} />
                           </button>
                           <button 
                             onClick={() => { setNewGuest(guest); setShowGuestModal(true); }} 
                             className="p-1 hover:text-indigo-600 transition-colors" 
                             title="Editar Convidado"
                           >
                             <Settings size={18} />
                           </button>
                           <button 
                             onClick={() => handleDeleteGuest(guest.id)} 
                             className="p-1 hover:text-red-600 transition-colors" 
                             title="Excluir Convidado"
                           >
                             <Trash2 size={18} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Sidebar Component (Internal) ---
  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  // Show public ticket view (bypass auth)
  if (view === 'PUBLIC_TICKET') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {isLoadingPublic ? (
          <div className="flex flex-col items-center gap-4">
             <Clock className="w-12 h-12 text-indigo-600 animate-spin" />
             <p className="text-slate-600 font-medium font-sans">Carregando seu ticket...</p>
          </div>
        ) : publicTicketData ? (
          <div className="max-w-[400px] w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-slate-900 mb-2">Seu Ticket Digital</h1>
                <p className="text-slate-500 text-sm font-sans">Apresente este código na entrada do evento</p>
             </div>

             <div 
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col items-center"
              style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
            >
              <div className="w-full bg-indigo-600 p-6 flex justify-between items-center">
                <div className="font-bold text-xl text-white">EventMaster AI</div>
                <div className="text-[10px] text-indigo-100 font-mono uppercase tracking-widest px-2 py-1 bg-white/10 rounded-lg backdrop-blur-sm">Digital Pass</div>
              </div>
              
              <div className="w-full p-8 flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-8 w-full max-w-[240px] flex justify-center shadow-inner">
                  <QRCode value={publicTicketData.guest.qrCodeData} size={200} level="M" fgColor="#1e293b" />
                </div>
                
                <div className="w-full text-center space-y-2 mb-8">
                  <h3 className="text-2xl font-black text-[#0f172a] tracking-tight">{publicTicketData.guest.name}</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[#64748b] text-[10px] font-mono tracking-tighter">
                    CPF: {publicTicketData.guest.cpf}
                  </div>
                </div>
                
                <div className="w-full py-6 border-y border-dashed grid grid-cols-2 gap-6" style={{ borderColor: '#e2e8f0' }}>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#94a3b8' }}>Evento</div>
                    <div className="text-sm font-bold truncate leading-tight" style={{ color: '#1e293b' }}>{publicTicketData.event.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#94a3b8' }}>Data</div>
                    <div className="text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>{new Date(publicTicketData.event.date).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="mt-8 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold leading-relaxed px-4">
                  Valide este ticket na recepção para garantir seu acesso
                </div>
              </div>
              
              <div className="w-full bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
                 <p className="text-[9px] text-slate-400 font-medium">© 2026 EventMaster AI • Sistema de Eventos Premium</p>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="mt-8 w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Calendar size={18} /> Imprimir / Salvar PDF
            </button>
            <button 
              onClick={() => setView('LOGIN')}
              className="mt-4 w-full py-2 text-indigo-600 font-medium text-xs hover:underline"
            >
              Voltar para o Início
            </button>
          </div>
        ) : (
          <div className="text-center">
             <p className="text-red-500 font-bold mb-4">Ticket não encontrado.</p>
             <button onClick={() => setView('LOGIN')} className="text-indigo-600 font-medium underline">Ir para Login</button>
          </div>
        )}
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">EM</div>
            <span className="text-xl font-bold text-slate-900">EventMaster</span>
          </div>
          
          <nav className="space-y-1 flex-1">
            <SidebarItem 
              icon={Home} 
              label="Eventos" 
              active={view === 'DASHBOARD' || view === 'EVENT_DETAILS'} 
              onClick={() => { setView('DASHBOARD'); setSelectedEvent(null); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={Users} 
              label="Convidados" 
              active={view === 'GUESTS'} 
              onClick={() => { setView('GUESTS'); setSelectedEvent(null); setIsSidebarOpen(false); }} 
            />
             <SidebarItem 
              icon={ScanLine} 
              label="Ler QR Code" 
              active={view === 'SCANNER'} 
              onClick={() => { setView('SCANNER'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={Bell} 
              label="Lembretes" 
              active={view === 'REMINDERS'} 
              onClick={() => { setView('REMINDERS'); setSelectedEvent(null); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={Settings} 
              label="Configurações" 
              active={view === 'SETTINGS'} 
              onClick={() => { setView('SETTINGS'); setSelectedEvent(null); setIsSidebarOpen(false); }} 
            />
          </nav>

          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="text-xs text-slate-500 px-2">
              {authUser?.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              Sair
            </button>
            <div className="text-xs text-slate-400 px-2">
               v1.0.0
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
             <Menu size={24} />
           </button>
           <span className="font-bold text-lg">EventMaster</span>
           <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Dynamic View Content */}
        <main className="flex-1 overflow-auto relative">
            {view === 'DASHBOARD' && renderDashboard()}
            {view === 'GUESTS' && renderGuests()}
            {view === 'EVENT_DETAILS' && renderEventDetails()}
            {view === 'REMINDERS' && renderReminders()}
            {view === 'SETTINGS' && renderSettings()}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden mobile-bottom-nav">
          <button 
            onClick={() => setView('DASHBOARD')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'DASHBOARD' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Home size={24} />
            <span className="text-[10px] font-medium">Eventos</span>
          </button>
          <button 
            onClick={() => setView('GUESTS')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'GUESTS' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Users size={24} />
            <span className="text-[10px] font-medium">Convidados</span>
          </button>
          <button 
            onClick={() => setView('SCANNER')}
            className="flex flex-col items-center justify-center -translate-y-4 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg"
          >
            <QrCode size={28} />
          </button>
          <button 
            onClick={() => setView('REMINDERS')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'REMINDERS' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Bell size={24} />
            <span className="text-[10px] font-medium">Alertas</span>
          </button>
          <button 
            onClick={() => setView('SETTINGS')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'SETTINGS' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Settings size={24} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        </nav>
      </div>
      
      {/* Full Screen Views that override layout */}
      {view === 'SCANNER' && (
        <Scanner 
          onClose={() => {
            // Return to context if available, else dashboard
            if (selectedEvent) setView('EVENT_DETAILS');
            else setView('DASHBOARD');
          }}
          onScan={handleScan}
        />
      )}

      {/* Check-in Feedback */}
      {scanResult.status !== 'idle' && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          scanResult.status === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {scanResult.status === 'success' ? <CheckCircle size={24} /> : <X size={24} className="rotate-45" />}
          <span className="font-medium">{scanResult.message}</span>
        </div>
      )}

      {/* --- Modals --- */}

      {/* Create/Edit Event Modal */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title={newEvent.id ? "Editar Evento" : "Criar Novo Evento"}>
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Evento</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Gala de Verão (Obrigatório)"
              value={newEvent.name || ''}
              onChange={e => setNewEvent({...newEvent, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={newEvent.date || ''}
                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Local do Evento"
                value={newEvent.location || ''}
                onChange={e => setNewEvent({...newEvent, location: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Capa do Evento</label>
            <div className="flex gap-4 items-center">
              {newEvent.imageUrl && (
                <img src={newEvent.imageUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
              )}
              <div className="flex-1 relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="hidden" 
                  id="event-image-upload" 
                />
                <label 
                  htmlFor="event-image-upload"
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm text-slate-600"
                >
                  {isUploading ? (
                    <><Clock className="animate-spin" size={16} /> Subindo...</>
                  ) : (
                    <><Calendar size={16} /> {newEvent.imageUrl ? 'Alterar Imagem' : 'Selecionar Imagem'}</>
                  )}
                </label>
              </div>
            </div>
            <input type="text" className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              placeholder="Ou cole a URL da imagem aqui..."
              value={newEvent.imageUrl || ''}
              onChange={e => setNewEvent({...newEvent, imageUrl: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Atrações (separadas por vírgula)</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Banda X, DJ Y"
                value={newEvent.attractions?.join(', ') || ''}
                onChange={e => setNewEvent({...newEvent, attractions: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Galeria (URLs por vírgula)</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="url1, url2"
                value={newEvent.gallery?.join(', ') || ''}
                onChange={e => setNewEvent({...newEvent, gallery: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              />
            </div>
          </div>
          <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-slate-700">Descrição</label>
               <button type="button" disabled={!newEvent.name || !newEvent.location || isGeneratingAI} onClick={handleGenerateDescription}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 font-medium">
                 <Sparkles size={12} /> {isGeneratingAI ? 'Gerando...' : 'Sugestão IA'}
               </button>
             </div>
            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
              placeholder="Descreva seu evento..."
              value={newEvent.description || ''}
              onChange={e => setNewEvent({...newEvent, description: e.target.value})}
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isUploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isUploading ? <><Clock className="animate-spin" size={18} /> Processando Imagem...</> : (newEvent.id ? 'Salvar Alterações' : 'Criar Evento')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Guest Modal */}
      <Modal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} title={newGuest.id ? "Editar Convidado" : "Cadastrar Convidado"}>
        <form onSubmit={handleAddGuest} className="space-y-4">
          {!selectedEvent && (
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar Evento</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={newGuest.targetEventId || ''}
                  onChange={e => setNewGuest({...newGuest, targetEventId: e.target.value})}
                  required
                >
                  <option value="">-- Escolha o Evento --</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
             </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Maria Silva"
              value={newGuest.name || ''}
              onChange={e => setNewGuest({...newGuest, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="000.000.000-00"
              value={newGuest.cpf || ''}
              onChange={e => setNewGuest({...newGuest, cpf: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
              <input required type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="(00) 00000-0000"
                value={newGuest.phone || ''}
                onChange={e => setNewGuest({...newGuest, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="email@exemplo.com"
                value={newGuest.email || ''}
                onChange={e => setNewGuest({...newGuest, email: e.target.value})}
              />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-indigo-100 transition-all active:scale-95">
              {newGuest.id ? 'Salvar Alterações' : 'Adicionar Convidado'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View QR Modal */}
      <Modal isOpen={!!showQRModal} onClose={() => setShowQRModal(null)} title="Ticket do Convidado">
        {showQRModal && (
          <div className="flex flex-col items-center justify-center">
            <div className="fixed top-0 left-0 pointer-events-none z-[-100] opacity-[0.001]">
              <div 
                id="digital-ticket" 
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#1e293b',
                  borderColor: '#f1f5f9' 
                }}
                className="w-[350px] p-6 rounded-2xl border-2 flex flex-col items-center"
              >
                <div className="w-full flex justify-between items-center mb-6">
                  <div className="font-bold text-xl" style={{ color: '#4f46e5' }}>EventMaster AI</div>
                  <div 
                    className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded"
                    style={{ color: '#94a3b8', backgroundColor: '#f8fafc' }}
                  >
                    Digital Pass
                  </div>
                </div>
                
                <div 
                  className="w-full h-32 rounded-xl mb-6 overflow-hidden border"
                  style={{ backgroundColor: '#f1f5f9', borderColor: '#f1f5f9' }}
                >
                  <img src={events.find(e => e.id === showQRModal.eventId)?.imageUrl} 
                    alt="Event" 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous" 
                    style={{ border: 'none' }}
                  />
                </div>
                
                <div className="bg-white p-3 rounded-xl shadow-sm border border-[#f1f5f9] mb-6">
                  <QRCode value={showQRModal.qrCodeData} size={160} level="M" fgColor="#1e293b" />
                </div>
                
                <div className="w-full text-center space-y-1 mb-6">
                  <h3 className="text-xl font-bold text-[#0f172a]">{showQRModal.name}</h3>
                  <p className="text-[#64748b] text-xs font-mono">{showQRModal.cpf}</p>
                </div>
                
                <div className="w-full pt-4 border-t border-dashed grid grid-cols-2 gap-4" style={{ borderColor: '#e2e8f0' }}>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-tight" style={{ color: '#94a3b8' }}>Evento</div>
                    <div className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{events.find(e => e.id === showQRModal.eventId)?.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-tight" style={{ color: '#94a3b8' }}>Data</div>
                    <div className="text-sm font-bold" style={{ color: '#1e293b' }}>{new Date(events.find(e => e.id === showQRModal.eventId)?.date || '').toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="mt-8 text-[9px] text-[#cbd5e1] text-center uppercase tracking-widest font-medium">
                  Apresente este QR Code na entrada para validar seu acesso
                </div>
              </div>
            </div>

            {/* Visual Preview for User */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 w-full max-w-[300px] flex flex-col items-center shadow-inner">
               <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 mb-6">
                  <QRCode value={showQRModal.qrCodeData} size={180} level="M" fgColor="#1e293b" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 text-center">{showQRModal.name}</h3>
               <p className="text-slate-500 text-sm">Convite Individual</p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
              <button 
                onClick={() => handleShareTicket(showQRModal)} 
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <Share2 size={20} /> Compartilhar Ticket (Imagem)
              </button>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  onClick={() => handleShareTicket(showQRModal)} 
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium text-sm transition-all"
                >
                  <MessageCircle size={18} /> WhatsApp
                </button>
                <button 
                  onClick={() => sendEmail(showQRModal)} 
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm transition-all"
                >
                  <Mail size={18} /> Email
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default App;