
const pool = require('../config/database');
const { buscarProduto } = require('../services/fakeStore');
const { monitorarProduto } = require('../services/monitoramento');
const { buscarHistorico } = require('../services/historico');
const autenticar = require('../middlewares/autenticar');

async function produtosRoutes(fastify) {

    // Protege todas as rotas deste arquivo
    fastify.addHook('preHandler', autenticar);

    // Cadastrar produto
    fastify.post('/', async (request, reply) => {
        const { fakeStoreId, precoAlvo } = request.body || {};
        const usuarioId = request.user.id;

        if (
            !Number.isInteger(fakeStoreId) ||
            fakeStoreId <= 0 ||
            typeof precoAlvo !== 'number' ||
            !Number.isFinite(precoAlvo) ||
            precoAlvo <= 0
        ) {
            return reply.code(400).send({
                erro: 'Informe um ID válido e um preço-alvo positivo.'
            });
        }

        try {
            const produtoAPI = await buscarProduto(fakeStoreId);

            const [resultado] = await pool.execute(
                `INSERT INTO produtos
                (nome, fake_store_id, preco_atual, preco_alvo, usuario_id)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    produtoAPI.nome,
                    produtoAPI.id,
                    produtoAPI.preco,
                    precoAlvo,
                    usuarioId
                ]
            );

            return reply.code(201).send({
                mensagem: 'Produto cadastrado!',
                id: resultado.insertId,
                nome: produtoAPI.nome,
                precoAtual: produtoAPI.preco,
                precoAlvo
            });

        } catch (erro) {
            return reply.code(400).send({
                erro: erro.message
            });
        }
    });

    // Listar somente os produtos do usuário
    fastify.get('/', async (request) => {
        const [produtos] = await pool.execute(
            `SELECT * FROM produtos
             WHERE usuario_id = ?
             ORDER BY id DESC`,
            [request.user.id]
        );

        return produtos;
    });

    // Alterar preço simulado
    fastify.patch('/:id/preco-simulado', async (request, reply) => {
        const id = Number(request.params.id);
        const { preco } = request.body || {};
        const usuarioId = request.user.id;

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            typeof preco !== 'number' ||
            !Number.isFinite(preco) ||
            preco <= 0
        ) {
            return reply.code(400).send({
                erro: 'Informe um ID e um preço válido.'
            });
        }

        const [resultado] = await pool.execute(
            `UPDATE produtos
             SET preco_simulado = ?
             WHERE id = ? AND usuario_id = ?`,
            [preco, id, usuarioId]
        );

        if (resultado.affectedRows === 0) {
            const [existente] = await pool.execute(
                'SELECT id FROM produtos WHERE id = ? AND usuario_id = ?',
                [id, usuarioId]
            );

            if (existente.length === 0) {
                return reply.code(404).send({
                    erro: 'Produto não encontrado.'
                });
            }
        }

        return {
            mensagem: 'Preço simulado atualizado!',
            produtoId: id,
            novoPreco: preco
        };
    });

    // Remover preço simulado
    fastify.delete('/:id/preco-simulado', async (request, reply) => {
        const id = Number(request.params.id);
        const usuarioId = request.user.id;

        if (!Number.isInteger(id) || id <= 0) {
            return reply.code(400).send({
                erro: 'ID inválido.'
            });
        }

        const [resultado] = await pool.execute(
            `UPDATE produtos
             SET preco_simulado = NULL
             WHERE id = ? AND usuario_id = ?`,
            [id, usuarioId]
        );

        if (resultado.affectedRows === 0) {
            const [existente] = await pool.execute(
                'SELECT id FROM produtos WHERE id = ? AND usuario_id = ?',
                [id, usuarioId]
            );

            if (existente.length === 0) {
                return reply.code(404).send({
                    erro: 'Produto não encontrado.'
                });
            }
        }

        return {
            mensagem: 'Simulação removida. O preço voltará a ser consultado na API.'
        };
    });

    // Forçar verificação
    fastify.post('/:id/verificar', async (request, reply) => {
        const id = Number(request.params.id);
        const usuarioId = request.user.id;

        if (!Number.isInteger(id) || id <= 0) {
            return reply.code(400).send({
                erro: 'ID inválido.'
            });
        }

        const [produtos] = await pool.execute(
            'SELECT id FROM produtos WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );

        if (produtos.length === 0) {
            return reply.code(404).send({
                erro: 'Produto não encontrado.'
            });
        }

        try {
            return await monitorarProduto(id);
        } catch (erro) {
            return reply.code(400).send({
                erro: erro.message
            });
        }
    });

    // Consultar histórico
    fastify.get('/:id/historico', async (request, reply) => {
        const id = Number(request.params.id);
        const usuarioId = request.user.id;

        if (!Number.isInteger(id) || id <= 0) {
            return reply.code(400).send({
                erro: 'ID inválido.'
            });
        }

        const [produtos] = await pool.execute(
            'SELECT id FROM produtos WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );

        if (produtos.length === 0) {
            return reply.code(404).send({
                erro: 'Produto não encontrado.'
            });
        }

        const historico = await buscarHistorico(id);

        return {
            produtoId: id,
            quantidadeRegistros: historico.length,
            historico
        };
    });
}

module.exports = produtosRoutes;
