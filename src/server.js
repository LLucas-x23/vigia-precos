require('dotenv').config();

const { iniciarMonitoramento } =
    require('./services/monitoramento');

const fastify = require('fastify')({
    logger: true
});

const cors = require('@fastify/cors');

fastify.register(cors, {
    origin: true,
    methods: [
        'GET',
        'HEAD',
        'POST',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ]
});

const jwt = require('@fastify/jwt');
fastify.register(jwt, {
    secret: process.env.JWT_SECRET
});


const pool = require('./config/database');
const produtosRoutes = require('./routes/produtos');

fastify.register(produtosRoutes, {
    prefix: '/api/produtos'
});

const authRoutes = require('./routes/auth');
fastify.register(authRoutes, {
    prefix: '/api/auth'
});

fastify.get('/', async () => {
    return {
        sistema: 'Vigia Preços',
        status: 'online'
    };
});

async function iniciarServidor() {
    try {
        await pool.query('SELECT 1');

        console.log('MySQL conectado!');

        await fastify.listen({
            port: Number(process.env.PORT) || 3000,
            host: '0.0.0.0'
        });
        iniciarMonitoramento();

    } catch (erro) {
        fastify.log.error(erro);
        process.exit(1);
    }
}

iniciarServidor();
