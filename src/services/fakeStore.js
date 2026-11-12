async function buscarProduto(id) {
    const resposta = await fetch(
        `https://fakestoreapi.com/products/${id}`,
        {
            signal: AbortSignal.timeout(10000)
        }
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
