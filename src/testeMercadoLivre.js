
const { buscarPreco } = require('./services/mercadoLivre');

async function testar() {
    try {
        const produto = await buscarPreco(
            'https://produto.mercadolivre.com.br/MLB-4340744280-tnis-nike-revolution-7-infantil-_JM?searchVariation=181313607479#is_advertising=true&searchVariation=181313607479&backend_model=search-backend&be_origin=backend&position=3&search_layout=grid&type=pad&tracking_id=e8fad92c-ebc5-4af7-bc92-e965680ec237&ad_domain=VQCATCORE_LST&ad_position=3&ad_click_id=N2Y5MjE0OTEtODMxYy00ZGY5LTgzZTUtZTg4ZTFiYThiN2Fj'
        );

        console.log(produto);

    } catch (erro) {
        console.error(erro.message);
    }
}

testar();
