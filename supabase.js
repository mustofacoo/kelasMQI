// supabase.js — Markaz Qiroat Indonesia
// Menggunakan Supabase Auth untuk autentikasi admin

const SUPABASE_URL = 'https://bduovhlebjfwrcykncll.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdW92aGxlYmpmd3JjeWtuY2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzMyMTcsImV4cCI6MjA5NTgwOTIxN30.aqTMpz2uCqZ5WEuc_UL0ayfh-o3lHXP8Pkwt1Pnj3xg';

const CLASSES_TABLE = 'classes';

const ADMIN_EMAIL = 'ssutofa@gmail.com'; // ← ganti sesuai email admin

const isConfigured = () => (
  Boolean(window.supabase) &&
  SUPABASE_URL.includes('.supabase.co')
);

const client = isConfigured()
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Mapper ──────────────────────────────────────────────
const toAppClass = (row) => ({
  id: row.id,
  nama: row.nama || '',
  kategori: row.kategori || '',
  deskripsi: row.deskripsi || '',
  pengajar: row.pengajar || '',
  jadwal: row.jadwal || '',
  status: row.status || 'dibuka',
  formUrl: row.form_url || ''
});

const toDbClass = (item) => ({
  nama: item.nama || '',
  kategori: item.kategori || '',
  deskripsi: item.deskripsi || '',
  pengajar: item.pengajar || '',
  jadwal: item.jadwal || '',
  status: item.status || 'dibuka',
  form_url: item.formUrl || ''
});

// ── API ─────────────────────────────────────────────────
window.MQISupabase = {
  isConfigured,

  // Cek apakah sesi admin masih aktif (untuk refresh halaman)
  async getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  },

  async loginAdmin(password) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { data, error } = await client.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password,
    });

    if (error) throw new Error('Password salah atau akun tidak ditemukan.');
    return data.session;
  },

  async logoutAdmin() {
    if (!client) return;
    await client.auth.signOut();
  },

  async changeAdminPassword(newPassword) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password baru minimal 8 karakter.');
    }

    // Supabase Auth — update password user yang sedang login
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async listClasses() {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { data, error } = await client
      .from(CLASSES_TABLE)
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return (data || []).map(toAppClass);
  },

  async createClass(item) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { data, error } = await client
      .from(CLASSES_TABLE)
      .insert(toDbClass(item))
      .select('*')
      .single();

    if (error) throw error;
    return toAppClass(data);
  },

  async updateClass(id, item) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { data, error } = await client
      .from(CLASSES_TABLE)
      .update(toDbClass(item))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return toAppClass(data);
  },

  async deleteClass(id) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { error } = await client
      .from(CLASSES_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setClassStatus(id, status) {
    if (!client) throw new Error('Supabase belum dikonfigurasi.');

    const { data, error } = await client
      .from(CLASSES_TABLE)
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return toAppClass(data);
  },
};