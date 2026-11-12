async function buscarProduto(id) {
    const resposta = await fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
});
    );

    const conteudo = await resposta.text();

    console.log('Fake Store Status:', resposta.status);
    console.log('Fake Store Resposta:', conteudo);

    if (!resposta.ok) {
        throw new Error(`Erro na Fake Store API: ${resposta.status}`);
    }

    const produto = JSON.parse(conteudo);

    if (!produto || !produto.id || typeof produto.price !== 'number') {
        throw new Error('Produto inválido retornado pela API.');
    }

    return {
        id: produto.id,
        nome: produto.title,
        preco: produto.price
    };
}

module.exports = { buscarProduto };
