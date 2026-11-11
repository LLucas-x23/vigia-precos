const { enviarEmail } = require('./services/email');

async function testar() {
    try {
        await enviarEmail(
            'Teste - Vigia Preços',
            'Se você recebeu esta mensagem, a integração de e-mail está funcionando!'
        );

        console.log('Teste concluído!');
    } catch (erro) {
        console.error('Erro ao enviar e-mail:', erro);
    }
}

testar();