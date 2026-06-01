const { createApp, ref, computed, reactive, onMounted, onUnmounted, nextTick } = Vue;

const STORAGE_KEY = 'mqiClasses';

const DEFAULT_CLASSES = [
  {
    id: 1, nama: "Qiroat Sab'ah - Tingkat Dasar",
    kategori: "Qiroat", deskripsi: "Mempelajari tujuh bacaan Al-Qur'an (Qiroat Sab'ah) dari jalur-jalur utama. Cocok untuk pemula yang sudah lancar membaca Al-Qur'an.",
    pengajar: "Ust. Ahmad Faris, Lc.", jadwal: "Sabtu & Ahad, 08.00-09.30 WIB",
    status: "dibuka", formUrl: "https://forms.google.com"
  },
];

const COLORS = [
  ['#064e3b','#047857'], ['#065f46','#059669'], ['#1e3a5f','#2563eb'],
  ['#3b1f5e','#7c3aed'], ['#4a2308','#b45309'], ['#1a2e4a','#0ea5e9'],
];

createApp({
  setup() {
    const db = window.MQISupabase;

    const page = ref('home');
    const isLoggedIn = ref(false);
    const classes = ref([]);
    const searchQuery = ref('');
    const filterStatus = ref('all');
    const selectedClass = ref(null);
    const showAddForm = ref(false);
    const editingId = ref(null);
    const toasts = ref([]);
    const isLoading = ref(true);
    const isSaving = ref(false);
    const isChangingPassword = ref(false);
    const dataSourceLabel = ref(db?.isConfigured() ? 'Supabase' : 'Local fallback');

    const showHiddenAdminLogin = ref(false);
    const adminLoginPassword = ref('');
    const adminLoginError = ref('');

    const form = reactive({
      nama: '', kategori: '', deskripsi: '', pengajar: '',
      jadwal: '', status: 'dibuka', formUrl: ''
    });

    const passwordForm = reactive({
      current: '',
      next: '',
      confirm: ''
    });

onMounted(async () => {
  // Cek sesi dulu sebelum load, agar status login sudah benar saat UI render
  try {
    const session = await db.getSession();
    if (session) {
      isLoggedIn.value = true;
      page.value = 'admin';
    }
  } catch (e) {
    console.warn('Gagal cek sesi:', e);
  }

  await loadClasses();

  window.addEventListener('keydown', handleKeyboardShortcut);
  window.addEventListener('keydown', handleEscape);
});

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyboardShortcut);
      window.removeEventListener('keydown', handleEscape);
    });

    const loadClasses = async () => {
      isLoading.value = true;

      try {
        if (db?.isConfigured()) {
          classes.value = await db.listClasses();
          dataSourceLabel.value = 'Supabase';
          return;
        }

        classes.value = loadLocalClasses();
        dataSourceLabel.value = 'Local fallback';
      } catch (error) {
        console.error(error);
        classes.value = loadLocalClasses();
        dataSourceLabel.value = 'Local fallback';
        toast('Gagal membaca Supabase. Data lokal ditampilkan sementara.', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    const loadLocalClasses = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_CLASSES;
      } catch (error) {
        console.error(error);
        localStorage.removeItem(STORAGE_KEY);
        return DEFAULT_CLASSES;
      }
    };

    const saveLocalClasses = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(classes.value));
    };

    const handleKeyboardShortcut = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        showHiddenAdminLogin.value = true;
        adminLoginPassword.value = '';
        adminLoginError.value = '';
      }
    };

    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      selectedClass.value = null;
      showHiddenAdminLogin.value = false;
    };

    const openCount = computed(() => classes.value.filter(c => c.status === 'dibuka').length);


    const STATUS_ORDER = { dibuka: 0, segera: 1, ditutup: 2 };

    const filteredClasses = computed(() => {
      let list = classes.value;
      if (filterStatus.value !== 'all') list = list.filter(c => c.status === filterStatus.value);
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(c =>
          c.nama.toLowerCase().includes(q) ||
          c.deskripsi.toLowerCase().includes(q) ||
          (c.kategori || '').toLowerCase().includes(q)
        );
      }
      return [...list].sort((a, b) =>
        (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      );
    });
    const sortedAdminClasses = computed(() =>
  [...classes.value].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  )
);

const hashId = (id) => {
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffff;
  }
  return hash;
};

const cardBg = (cls) => {
  const idx = hashId(cls.id) % COLORS.length;
  const [c1, c2] = COLORS[idx];
  return { background: `linear-gradient(135deg, ${c1}, ${c2})` };
};

    const badgeClass = (status) => ({ dibuka:'badge-open', ditutup:'badge-closed', segera:'badge-soon' }[status]);
    const badgeLabel = (status) => ({ dibuka:'Dibuka', ditutup:'Ditutup', segera:'Segera Hadir' }[status]);

    const openModal = async (cls) => {
      if (cls.status !== 'dibuka') return;
      selectedClass.value = cls;
      await nextTick();
      document.querySelector('.modal-close')?.focus();
    };

    const isValidRegistrationUrl = (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    };
    const doAdminLogin = async () => {
      adminLoginError.value = '';

      try {
        await db.loginAdmin(adminLoginPassword.value);
        isLoggedIn.value = true;
        adminLoginPassword.value = '';
        showHiddenAdminLogin.value = false;
        page.value = 'admin';
        toast('Login berhasil.', 'success');
      } catch (error) {
        console.error(error);
        adminLoginError.value = error.message || 'Login gagal.';
        adminLoginPassword.value = '';
      }
    };

 const doLogout = async () => {
  await db.logoutAdmin();
  isLoggedIn.value = false;
  page.value = 'home';
  adminLoginPassword.value = '';
  adminLoginError.value = '';
  showHiddenAdminLogin.value = false;
  toast('Anda telah logout', 'success');
};

    const toast = (msg, type='success') => {
      const id = Date.now();
      toasts.value.push({ id, msg, type });
      setTimeout(() => toasts.value = toasts.value.filter(t => t.id !== id), 3000);
    };

    const resetForm = () => {
      Object.assign(form, { nama:'', kategori:'', deskripsi:'', pengajar:'', jadwal:'', status:'dibuka', formUrl:'' });
      editingId.value = null;
      showAddForm.value = false;
    };

    const saveClass = async () => {
      if (!form.nama.trim() || !form.deskripsi.trim()) {
        toast('Nama dan deskripsi wajib diisi!', 'error');
        return;
      }

      if (!isValidRegistrationUrl(form.formUrl)) {
        toast('Link Google Form harus berupa URL yang valid.', 'error');
        return;
      }

      isSaving.value = true;
      try {
        if (editingId.value) {
          if (db?.isConfigured()) {
            const updated = await db.updateClass(editingId.value, form);
            const idx = classes.value.findIndex(c => c.id === editingId.value);
            if (idx > -1) classes.value[idx] = updated;
          } else {
            const idx = classes.value.findIndex(c => c.id === editingId.value);
            if (idx > -1) classes.value[idx] = { ...classes.value[idx], ...form };
            saveLocalClasses();
          }
          toast('Kelas berhasil diperbarui.');
        } else {
          if (db?.isConfigured()) {
            classes.value.push(await db.createClass(form));
          } else {
            const newId = Math.max(0, ...classes.value.map(c => Number(c.id) || 0)) + 1;
            classes.value.push({ id: newId, ...form });
            saveLocalClasses();
          }
          toast('Kelas baru berhasil ditambahkan.');
        }

        resetForm();
      } catch (error) {
        console.error(error);
        toast('Gagal menyimpan kelas ke Supabase.', 'error');
      } finally {
        isSaving.value = false;
      }
    };

    const startEdit = (cls) => {
      Object.assign(form, {
        nama: cls.nama,
        kategori: cls.kategori || '',
        deskripsi: cls.deskripsi,
        pengajar: cls.pengajar || '',
        jadwal: cls.jadwal || '',
        status: cls.status,
        formUrl: cls.formUrl || ''
      });
      editingId.value = cls.id;
      showAddForm.value = false;
      setTimeout(() => window.scrollTo({top: 0, behavior: 'smooth'}), 50);
    };

    const cancelEdit = () => resetForm();

    const deleteClass = async (id) => {
      if (!confirm('Yakin ingin menghapus kelas ini?')) return;

      try {
        if (db?.isConfigured()) {
          await db.deleteClass(id);
        }
        classes.value = classes.value.filter(c => c.id !== id);
        if (!db?.isConfigured()) saveLocalClasses();
        toast('Kelas dihapus.', 'error');
      } catch (error) {
        console.error(error);
        toast('Gagal menghapus kelas dari Supabase.', 'error');
      }
    };

    const setStatus = async (cls, status) => {
      const previousStatus = cls.status;
      cls.status = status;

      try {
        if (db?.isConfigured()) {
          const updated = await db.setClassStatus(cls.id, status);
          Object.assign(cls, updated);
        } else {
          saveLocalClasses();
        }
        toast(`Status diubah: ${badgeLabel(status)}`);
      } catch (error) {
        console.error(error);
        cls.status = previousStatus;
        toast('Gagal mengubah status di Supabase.', 'error');
      }
    };

    const changeAdminPassword = async () => {
      if (!passwordForm.next || !passwordForm.confirm) {
        toast('Lengkapi semua kolom password.', 'error');
        return;
      }

      if (passwordForm.next !== passwordForm.confirm) {
        toast('Konfirmasi password baru belum sama.', 'error');
        return;
      }

      isChangingPassword.value = true;
      try {
        await db.changeAdminPassword(passwordForm.next);
        Object.assign(passwordForm, { current: '', next: '', confirm: '' });
        toast('Password admin berhasil diubah.');
      } catch (error) {
        console.error(error);
        toast(error.message || 'Gagal mengubah password admin.', 'error');
      } finally {
        isChangingPassword.value = false;
      }
    };

    return {
      page, isLoggedIn, isLoading, isSaving, isChangingPassword, dataSourceLabel,
      classes, sortedAdminClasses, searchQuery, filterStatus, selectedClass,
      showAddForm, editingId, form, passwordForm, toasts,
      openCount, filteredClasses,
      cardBg, badgeClass, badgeLabel, openModal,
      doLogout, saveClass, startEdit, cancelEdit, deleteClass, setStatus,
      showHiddenAdminLogin, adminLoginPassword, adminLoginError,
      doAdminLogin, changeAdminPassword
    };
  }
}).mount('#app');
