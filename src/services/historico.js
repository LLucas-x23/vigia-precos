
const pool = require('../config/database');

async function buscarHistorico(produtoId) {
    const [resultados] = await pool.execute(
        `SELECT preco, verificado_em
         FROM historico_precos
         WHERE produto_id = ?
         ORDER BY verificado_em ASC`,
        [produtoId]
    );

    const historico = resultados.map(registro => ({
        preco: Number(registro.preco),
        data: registro.verificado_em
    }));

    return historico;
}

module.exports = { buscarHistorico };
