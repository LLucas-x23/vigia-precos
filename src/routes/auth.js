
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const { enviarEmail } = require('../services/email');

async function authRoutes(fastify) {

    // CADASTRO
    fastify.post('/cadastro', async (request, reply) => {
        const { nome, email, senha } = request.body || {};

        if (
            typeof nome !== 'string' ||
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !nome.trim() ||
            !email.trim() ||
            senha.length < 8
        ) {
            return reply.code(400).send({
                erro: 'Informe nome, e-mail e uma senha com pelo menos 8 caracteres.'
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            return reply.code(400).send({
                erro: 'Informe um e-mail válido.'
            });
        }

        try {
            const senhaHash = await bcrypt.hash(senha, 12);

            const token = crypto.randomBytes(32).toString('hex');

            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const expiraEm = new Date(
                Date.now() + 24 * 60 * 60 * 1000
            );

            const [resultado] = await pool.execute(
                `INSERT INTO usuarios
                 (nome, email, senha_hash, token_verificacao, token_expira_em)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    nome.trim(),
                    emailNormalizado,
                    senhaHash,
                    tokenHash,
                    expiraEm
                ]
            );

            const frontendURL = (
                process.env.FRONTEND_URL ||
                'http://127.0.0.1:5500'
            ).replace(/\/$/, '');

            const link = `${frontendURL}/confirmacao.html?token=${encodeURIComponent(token)}`;

            try {
                await enviarEmail(
                    'Confirme seu e-mail - Vigia Preços',
                    `Olá, ${nome.trim()}!

Para confirmar seu endereço de e-mail, acesse o link abaixo:

${link}

Este link expira em 24 horas.

Equipe Vigia Preços`,
                    emailNormalizado
                );

            } catch (erroEmail) {
                await pool.execute(
                    'DELETE FROM usuarios WHERE id = ?',
                    [resultado.insertId]
                );

                console.error(
                    'Erro ao enviar confirmação:',
                    erroEmail.message
                );

                return reply.code(502).send({
                    erro: 'Não foi possível enviar o e-mail de confirmação. Verifique o endereço e tente novamente.'
                });
            }

            return reply.code(201).send({
                mensagem: 'Cadastro realizado! Confira seu e-mail para confirmar a conta.'
            });

        } catch (erro) {
            if (erro.code === 'ER_DUP_ENTRY') {
                return reply.code(409).send({
                    erro: 'Este e-mail já está cadastrado.'
                });
            }

            console.error('Erro no cadastro:', erro);

            return reply.code(500).send({
                erro: 'Erro interno ao realizar cadastro.'
            });
        }
    });

    // CONFIRMAÇÃO DE E-MAIL
    fastify.post('/verificar-email', async (request, reply) => {
        const { token } = request.body || {};

        if (typeof token !== 'string' || !token) {
            return reply.code(400).send({
                erro: 'Token de confirmação não informado.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        try {
            const [resultado] = await pool.execute(
                `UPDATE usuarios
                 SET email_verificado = TRUE,
                     token_verificacao = NULL,
                     token_expira_em = NULL
                 WHERE token_verificacao = ?
                   AND token_expira_em > NOW()
                   AND email_verificado = FALSE`,
                [tokenHash]
            );

            if (resultado.affectedRows === 0) {
                return reply.code(400).send({
                    erro: 'Link inválido, expirado ou já utilizado.'
                });
            }

            return {
                mensagem: 'E-mail confirmado com sucesso!'
            };

        } catch (erro) {
            console.error('Erro ao confirmar e-mail:', erro);

            return reply.code(500).send({
                erro: 'Não foi possível confirmar seu e-mail.'
            });
        }
    });

    // LOGIN
    fastify.post('/login', async (request, reply) => {
        const { email, senha } = request.body || {};

        if (
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !email.trim() ||
            !senha
        ) {
            return reply.code(400).send({
                erro: 'Informe seu e-mail e sua senha.'
            });
        }

        try {
            const [usuarios] = await pool.execute(
                `SELECT id, nome, email, senha_hash, email_verificado
                 FROM usuarios
                 WHERE email = ?`,
                [email.trim().toLowerCase()]
            );

            if (usuarios.length === 0) {
                return reply.code(401).send({
                    erro: 'E-mail ou senha incorretos.'
                });
            }

            const usuario = usuarios[0];

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                return reply.code(401).send({
                    erro: 'E-mail ou senha incorretos.'
                });
            }

            if (!usuario.email_verificado) {
                return reply.code(403).send({
                    erro: 'Confirme seu e-mail antes de entrar.'
                });
            }

            const token = fastify.jwt.sign(
                {
                    id: usuario.id,
                    email: usuario.email
                },
                { expiresIn: '1d' }
            );

            return {
                mensagem: 'Login realizado com sucesso!',
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                }
            };

        } catch (erro) {
            console.error('Erro no login:', erro);

            return reply.code(500).send({
                erro: 'Erro interno ao realizar login.'
            });
        }
    });
}

module.exports = authRoutes;
