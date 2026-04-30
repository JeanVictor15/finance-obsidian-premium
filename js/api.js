/**
 * Finance Obsidian - API Service
 * Handles all interactions with Supabase
 */

// We assume FINANCE_CONFIG is already loaded via <script src="../../js/supabase.js">
// or we can import it if we make supabase.js a module too.
// For now, let's keep supabase.js as is and use the global.

const { SUPABASE_URL, SUPABASE_KEY } = window.FINANCE_CONFIG;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const api = {
    auth: {
        async getSession() {
            return await supabaseClient.auth.getSession();
        },
        async signOut() {
            return await supabaseClient.auth.signOut();
        },
        onAuthStateChange(callback) {
            return supabaseClient.auth.onAuthStateChange(callback);
        }
    },

    transactions: {
        async getAll(userId) {
            return await supabaseClient
                .from('movimentacoes')
                .select('*')
                .eq('user_id', userId)
                .order('data', { ascending: false });
        },
        async upsert(data, id = null) {
            if (id) {
                return await supabaseClient.from('movimentacoes').update(data).eq('id', id);
            }
            return await supabaseClient.from('movimentacoes').insert([data]);
        },
        async delete(id) {
            return await supabaseClient.from('movimentacoes').delete().eq('id', id);
        }
    },

    accounts: {
        async getAll(userId) {
            return await supabaseClient
                .from('contas')
                .select('*')
                .eq('user_id', userId)
                .order('vencimento', { ascending: true });
        },
        async upsert(data, id = null) {
            if (id) {
                return await supabaseClient.from('contas').update(data).eq('id', id);
            }
            return await supabaseClient.from('contas').insert([data]);
        },
        async delete(id) {
            return await supabaseClient.from('contas').delete().eq('id', id);
        },
        async markAsPaid(id) {
            return await supabaseClient
                .from('contas')
                .update({ status: 'paga' })
                .eq('id', id);
        }
    },

    fixedIncomes: {
        async getAll(userId) {
            return await supabaseClient
                .from('receitas_fixas')
                .select('*')
                .eq('user_id', userId)
                .order('dia_recebimento', { ascending: true });
        },
        async insert(data) {
            return await supabaseClient.from('receitas_fixas').insert([data]);
        },
        async delete(id) {
            return await supabaseClient.from('receitas_fixas').delete().eq('id', id);
        }
    }
};
