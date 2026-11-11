
async function buscarProduto(id) {
    const resposta = await fetch(
        `https://fakestoreapi.com/products/${id}`,
        {
            signal: AbortSignal.timeout(10000)
        }
    );

    if (!resposta.ok) {
        throw new Error(`Erro na Fake Store API: ${resposta.status}`);
    }

    const produto = await resposta.json();

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
