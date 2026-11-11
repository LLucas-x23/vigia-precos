
function extrairIdAnuncio(url) {
    const correspondencia = url.match(/MLB-?(\d+)/i);

    if (!correspondencia) {
        throw new Error('Não foi possível identificar o anúncio do Mercado Livre.');
    }

    return `MLB${correspondencia[1]}`;
}


async function buscarPreco(url) {
    const id = extrairIdAnuncio(url);

    const apiUrl = `https://api.mercadolibre.com/items/${id}`;

    console.log('ID identificado:', id);
    console.log('Consultando:', apiUrl);

    const resposta = await fetch(apiUrl, {
        headers: {
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
    });

    const corpo = await resposta.text();

    console.log('Status HTTP:', resposta.status);
    console.log('Resposta da API:', corpo);

    if (!resposta.ok) {
        throw new Error(
            `Mercado Livre retornou HTTP ${resposta.status}: ${corpo}`
        );
    }

    const dados = JSON.parse(corpo);

    if (dados.status !== 'active') {
        throw new Error('O anúncio não está ativo.');
    }

    return {
        id: dados.id,
        nome: dados.title,
        preco: dados.price,
        link: dados.permalink
    };
}


module.exports = {
    extrairIdAnuncio,
    buscarPreco
};
