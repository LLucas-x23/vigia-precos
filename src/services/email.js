const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarEmail(
    assunto,
    mensagem,
    destinatario = process.env.EMAIL_DESTINO
) {
    const resultado = await transporter.sendMail({
        from: `Vigia Preços <${process.env.EMAIL_FROM}>`,
        to: destinatario,
        subject: assunto,
        text: mensagem
    });

    console.log('E-mail enviado:', resultado.messageId);
    return resultado;
}

module.exports = { enviarEmail };