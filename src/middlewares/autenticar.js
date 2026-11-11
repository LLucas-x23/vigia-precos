
async function autenticar(request, reply) {
    try {
        await request.jwtVerify();
    } catch (erro) {
        return reply.code(401).send({
            erro: 'Acesso não autorizado. Faça login novamente.'
        });
    }
}

module.exports = autenticar;
