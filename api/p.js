import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase utilizando as variáveis de ambiente da Vercel
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Captura o ID mapeado através da query string definida no vercel.json (?id=:id)
  const { id } = req.query;

  // Validação preventiva para garantir que o ID foi fornecido
  if (!id) {
    return res.status(400).send('ID do chip NFC não foi identificado na requisição.');
  }

  try {
    // Busca na tabela 'chips_nfc' onde a coluna 'id' seja exatamente igual ao ID da URL
    const { data, error } = await supabase
      .from('chips_nfc')
      .select('link_destino')
      .eq('id', String(id).trim()) // .trim() remove espaços acidentais
      .maybeSingle(); // Evita lançar exceptions caso o registro não exista

    // Se houver falha de conexão/banco ou se o registro retornar vazio
    if (error || !data) {
      console.error("Erro no Supabase ou registro inexistente:", error);
      return res.status(404).send('Este produto NFC ainda não foi configurado no sistema.');
    }

    // Registro encontrado com sucesso! Executa o redirecionamento HTTP 302
    return res.redirect(302, data.link_destino);

  } catch (err) {
    // Captura falhas inesperadas de infraestrutura ou código
    console.error("Erro interno no handler:", err);
    return res.status(500).send('Erro interno no servidor: ' + err.message);
  }
}