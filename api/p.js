import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Configura cache na Vercel para acelerar requisições repetidas do mesmo chip
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
  
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('ID do chip não fornecido.');
  }

  try {
    // 1. Busca APENAS o link de destino (operação ultra leve)
    const { data, error } = await supabase
      .from('chips_nfc')
      .select('link_destino')
      .eq('id', String(id))
      .maybeSingle();

    if (error || !data) {
      return res.status(404).send('Chip NFC não encontrado.');
    }

    // 2. ATUALIZAÇÃO EM SEGUNDO PLANO (O segredo da velocidade!)
    // O comando roda SEM o "await". A Vercel dispara o comando pro banco 
    // e passa direto para a linha do redirecionamento sem esperar a resposta.
    supabase
      .from('chips_nfc')
      .update({ total_acessos: supabase.rpc('increment', { row_id: id }) }) // Se tiver a função RPC
      // Ou a forma padrão sem await:
      // .from('chips_nfc').update({ total_acessos: (data.total_acessos || 0) + 1 }).eq('id', id)
      .eq('id', String(id))
      .then(() => console.log('Contador atualizado em background.'))
      .catch(err => console.error('Erro ao atualizar contador:', err));

    // Opcional: Se quiser capturar o sistema operacional no log da Vercel para o futuro:
    const userAgent = req.headers['user-agent'] || '';
    const sistemaOp = userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' : 'Android/PC';
    console.log(`Acesso vindo de: ${sistemaOp}`);

    // 3. Redireciona na velocidade da luz
    return res.redirect(301, data.link_destino);

  } catch (err) {
    console.error('Erro no servidor:', err);
    return res.status(500).send('Erro interno.');
  }
}
