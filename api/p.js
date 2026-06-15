import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Configura cache na Vercel para acelerar as requisições
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
  
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('ID do chip não fornecido.');
  }

  try {
    // 1. Busca os dados atuais do chip (link e contadores)
    const { data, error } = await supabase
      .from('chips_nfc')
      .select('link_destino, total_acessos, acessos_ios, acessos_android')
      .eq('id', String(id))
      .maybeSingle();

    if (error || !data) {
      return res.status(404).send('Chip NFC não encontrado.');
    }

    // 2. Descobre o Sistema Operacional pelo User-Agent
    const userAgent = req.headers['user-agent'] || '';
    let updateData = {
      total_acessos: (data.total_acessos || 0) + 1
    };

    if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('Macintosh')) {
      updateData.acessos_ios = (data.acessos_ios || 0) + 1;
    } else if (userAgent.includes('Android')) {
      updateData.acessos_android = (data.acessos_android || 0) + 1;
    }

    // 3. ATUALIZAÇÃO EM SEGUNDO PLANO (Não trava o usuário!)
    // O código dispara a atualização para o banco e passa direto para o redirect
    supabase
      .from('chips_nfc')
      .update(updateData)
      .eq('id', String(id))
      .then(() => console.log('Contadores atualizados com sucesso.'))
      .catch(err => console.error('Erro ao atualizar contadores:', err));

    // 4. Redireciona na velocidade da luz para o destino final
    return res.redirect(302, data.link_destino);

  } catch (err) {
    console.error('Erro no servidor:', err);
    return res.status(500).send('Erro interno.');
  }
}
