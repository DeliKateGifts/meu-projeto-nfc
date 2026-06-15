import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('ID do chip não fornecido.');
  }

  try {
    // 1. Busca o link de destino e o contador atual do chip
    const { data, error } = await supabase
      .from('chips_nfc')
      .select('link_destino, total_acessos')
      .eq('id', String(id))
      .maybeSingle();

    if (error || !data) {
      return res.status(404).send('Chip NFC não encontrado ou inativo.');
    }

    // 2. Registra o acesso somando +1 (Acontece em segundo plano)
    const acessosAtuais = data.total_acessos || 0;
    
    // Usamos o "await" aqui para garantir que o banco salve antes de redirecionar,
    // ou podemos disparar sem await se quisermos velocidade máxima. 
    // Para contadores simples, o padrão abaixo é super seguro:
    await supabase
      .from('chips_nfc')
      .update({ total_acessos: acessosAtuais + 1 })
      .eq('id', String(id));

    // 3. Redireciona o usuário instantaneamente para o link final
    return res.redirect(302, data.link_destino);

  } catch (err) {
    console.error('Erro no servidor:', err);
    return res.status(500).send('Erro interno no servidor de redirecionamento.');
  }
}
