export type ProductExhibition = {
    id?: number,
    titulo: string,
    subtitulo: string,
    descricao: string,
    beneficios: {
        valor: string
    }[],
    preco: number,
    tipoProduto: string,
    periodo: string,
    status: string,
    tipoAula: string,
    quantidadeAula: number | null,
    duracaoMes: number
}
