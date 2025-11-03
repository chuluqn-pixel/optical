
import React from 'react';

interface ResepPrintProps {
    prescription: any;
    sale: any;
    optik: any;
}

const ResepPrint: React.FC<ResepPrintProps> = ({ prescription, sale, optik }) => {
    if (!prescription || !sale) return null;

    return (
        <div className="p-8 font-sans">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">{optik?.nama_instansi || '-'}</h1>
                <p className="text-sm">{optik?.alamat_instansi || '-'}, Telp: {optik?.telpon || '-'}</p>
            </div>

            <div className="flex justify-between mb-4">
                <div>
                    <p><strong>Nama:</strong> {sale.nama_pemesan}</p>
                    <p><strong>Tlp :</strong>{sale.telpon}</p>
                    <p><strong>Alamat:</strong> {sale.alamat}</p>
                </div>
                <div>
                    <p><strong>No. Resep:</strong> {sale.id_orders}</p>
                    <p><strong>No. Ref:</strong> {sale.no_ref}</p>
                    <p><strong>Tanggal:</strong> {sale.tanggal_pesan}</p>
                </div>
            </div>

            <h2 className="text-center font-bold text-lg mb-4">RESEP KACAMATA</h2>

            <table className="w-full border-collapse border-2 border-black">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-2"></th>
                        <th className="border border-black p-2">SPH</th>
                        <th className="border border-black p-2">CYL</th>
                        <th className="border border-black p-2">AXIS</th>
                        <th className="border border-black p-2">ADD</th>
                        <th className="border border-black p-2">PD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-bold text-center">OD (Kanan)</td>
                        <td className="border border-black p-2 text-center">{prescription.R_SPH}</td>
                        <td className="border border-black p-2 text-center">{prescription.R_CYL}</td>
                        <td className="border border-black p-2 text-center">{prescription.R_AXS}</td>
                        <td className="border border-black p-2 text-center">{prescription.R_ADD}</td>
                        <td className="border border-black p-2 text-center" rowSpan={2}>{prescription.PD}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold text-center">OS (Kiri)</td>
                        <td className="border border-black p-2 text-center">{prescription.L_SPH}</td>
                        <td className="border border-black p-2 text-center">{prescription.L_CYL}</td>
                        <td className="border border-black p-2 text-center">{prescription.L_AXS}</td>
                        <td className="border border-black p-2 text-center">{prescription.L_ADD}</td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-8 flex justify-end">
                <div className="text-center">
                    <p>Pemeriksa,</p>
                    <br /><br /><br />
                    <p>(______________________)</p>
                </div>
            </div>
        </div>
    );
};

export default ResepPrint;
