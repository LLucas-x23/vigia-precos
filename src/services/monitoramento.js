
const cron = require('node-cron');
const pool = require('../config/database');
const { buscarProduto } = require('./fakeStore');
const { enviarEmail } = require('./email');

async function monitorarProduto(id) {
    const [resultado] = await pool.execute(
        `SELECT p.*, u.email AS usuario_email
         FROM produtos p
         LEFT JOIN usuarios u ON u.id = p.usuario_id
         WHERE p.id = ?`,
        [id]
    );

    if (resultado.length === 0) {
        throw new Error('Produto não encontrado.');
    }

    const produto = resultado[0];

    let preco;

    if (produto.preco_simulado !== null) {
        preco = Number(produto.preco_simulado);
    } else {
        const dadosAPI = await buscarProduto(produto.fake_store_id);
        preco = dadosAPI.preco;
    }

    const precoAlvo = Number(produto.preco_alvo);
    const atingido = preco <= precoAlvo;

    await pool.execute(
        `UPDATE produtos
         SET preco_atual = ?,
             status = ?
         WHERE id = ?`,
        [
            preco,
            atingido ? 'atingido' : 'monitorando',
            id
        ]
    );

    let alertaEnviado = Boolean(produto.alerta_enviado);


    if (atingido && !alertaEnviado && produto.usuario_email) {
        // Reserva o envio. Apenas uma execução poderá conseguir.
        const [reserva] = await pool.execute(
            `UPDATE produtos
         SET alerta_enviado = TRUE
         WHERE id = ? AND alerta_enviado = FALSE`,
            [id]
        );

        if (reserva.affectedRows === 1) {
            try {
                const economia = precoAlvo - preco;

                const mensagem = `
Olá!

Um produto monitorado pelo Vigia Preços atingiu o preço desejado!

Produto: ${produto.nome}

Preço atual: R$ ${preco.toFixed(2)}
Preço desejado: R$ ${precoAlvo.toFixed(2)}

Economia: R$ ${economia.toFixed(2)}

Equipe Vigia Preços
            `;

                await enviarEmail(
                    'Preço desejado atingido! - Vigia Preços',
                    mensagem,
                    produto.usuario_email
                );

                alertaEnviado = true;

                console.log(`Alerta enviado para ${produto.usuario_email}`);

            } catch (erro) {
                // Se falhar, libera uma nova tentativa.
                await pool.execute(
                    `UPDATE produtos
                 SET alerta_enviado = FALSE
                 WHERE id = ?`,
                    [id]
                );

                alertaEnviado = false;

                console.error('Erro ao enviar alerta:', erro.message);
            }
        } else {
            alertaEnviado = true;
        }
    }

    console.log(
        `${produto.nome}: R$ ${preco.toFixed(2)} - ${atingido ? 'PREÇO ATINGIDO!' : 'Ainda monitorando'
        }`
    );

    return {
        produto: produto.nome,
        preco,
        precoAlvo,
        atingido,
        alertaEnviado
    };
}

async function monitorarProdutos() {
    console.log('Iniciando monitoramento...');

    try {
        const [produtos] = await pool.execute(
            `SELECT id FROM produtos
             WHERE status = 'monitorando'
                OR (status = 'atingido' AND alerta_enviado = FALSE)`
        );

        for (const produto of produtos) {
            try {
                await monitorarProduto(produto.id);
            } catch (erro) {
                console.error(
                    `Erro no produto ${produto.id}:`,
                    erro.message
                );
            }
        }

        console.log('Monitoramento finalizado!');

    } catch (erro) {
        console.error('Erro geral no monitoramento:', erro);
    }
}

function iniciarMonitoramento() {
    cron.schedule('*/30 * * * *', monitorarProdutos);

    console.log('Monitoramento agendado para cada 30 minutos.');
}

module.exports = {
    monitorarProduto,
    monitorarProdutos,
    iniciarMonitoramento
};
