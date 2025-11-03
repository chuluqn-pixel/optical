
import React from 'react';

interface NotaPrintProps {
    sale: any;
    saleDetails: any[];
    financialSummary: any;
    formatCurrency: (value: number | string) => string;
    getProductName: (id: string) => string;
    getProductPrice: (id: string) => number;
    optik: any;
}

const NotaPrint: React.FC<NotaPrintProps> = ({
    sale,
    saleDetails,
    financialSummary,
    formatCurrency,
    getProductName,
    getProductPrice,
    optik
}) => {
    if (!sale || !financialSummary) return null;

    return (
        <div className="p-8 text-xs font-sans">
            <div className="text-center mb-4">
                <h1 className="text-lg font-bold">{optik?.nama_instansi || '-'}</h1>
                <p>{optik?.alamat_instansi || '-'}</p>
                <p>Telp: {optik?.telpon || '-'}</p>
                <h2 className="text-base font-semibold mt-2">NOTA PENJUALAN</h2>
            </div>

            <div className="grid grid-cols-2 gap-x-4 mb-4">
                <div>
                    <p><strong>No. Nota:</strong> {sale.id_orders}</p>
                    <p><strong>No. Ref:</strong> {sale.no_ref}</p>
                </div>
                <div className="text-right">
                    <p><strong>Tanggal:</strong> {sale.tanggal_pesan}</p>
                </div>
            </div>

            <div className="mb-4">
                <p><strong>Kepada Yth:</strong></p>
                <p>{sale.nama_pemesan}</p>
                <p>{sale.alamat}</p>
                <p>{sale.telpon}</p>
            </div>
            
            <table className="w-full border-collapse border border-black mb-4">
                <thead>
                    <tr>
                        <th className="border border-black p-1">No</th>
                        <th className="border border-black p-1 text-left">Nama Barang</th>
                        <th className="border border-black p-1">Jumlah</th>
                        <th className="border border-black p-1 text-right">Harga</th>
                        <th className="border border-black p-1 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {saleDetails.map((item, index) => {
                         const price = getProductPrice(item.id_produk);
                         const total = parseFloat(item.jumlah) * price;
                        return (
                            <tr key={index}>
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1">{getProductName(item.id_produk)}</td>
                                <td className="border border-black p-1 text-center">{item.jumlah}</td>
                                <td className="border border-black p-1 text-right">{formatCurrency(price).replace('Rp ', '')}</td>
                                <td className="border border-black p-1 text-right">{formatCurrency(total).replace('Rp ', '')}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-1/2 space-y-1">
                    <div className="flex justify-between">
                        <span>Sub Total:</span>
                        <span>{formatCurrency(financialSummary.subTotal).replace('Rp ', '')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Diskon:</span>
                        <span>{formatCurrency(financialSummary.diskon).replace('Rp ', '')}</span>
                    </div>
                     <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(financialSummary.totalBayar).replace('Rp ', '')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Bayar Instansi:</span>
                        <span>{formatCurrency(financialSummary.bayarInstansi).replace('Rp ', '')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Sisa:</span>
                        <span>{formatCurrency(financialSummary.sisaBayar).replace('Rp ', '')}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-between text-center">
                <div>
                    <p>(Hormat Kami)</p>
                    <br/><br/>
                    <p>(................)</p>
                </div>
                <div>
                    <p>(Penerima)</p>
                    <br/><br/>
                    <p>({sale.nama_pemesan || '................'})</p>
                </div>
            </div>
            <p className="mt-4 text-center text-xs italic">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
        </div>
    );
}

export default NotaPrint;
