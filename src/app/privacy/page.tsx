export default function PrivacyPolicy() {
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
            <h1>Politika zasebnosti</h1>
            <p>Zadnja posodobitev: {new Date().toLocaleDateString("sl-SI")}</p>

            <h2>1. Kdo smo</h2>
            <p>
                Senzemo Production Tool je interno orodje podjetja Senzemo, namenjeno
                upravljanju proizvodnje in zaloge senzorjev.
            </p>

            <h2>2. Katere podatke zbiramo</h2>
            <p>
                Ob prijavi preko Google računa zbiramo vaše ime, e-poštni naslov in
                profilno sliko, izključno za namen avtentikacije in identifikacije
                znotraj sistema.
            </p>

            <h2>3. Kako uporabljamo podatke</h2>
            <p>
                Podatke uporabljamo izključno za delovanje internega orodja
                (avtentikacija, sledenje aktivnostim v sistemu). Podatkov ne
                posredujemo tretjim osebam.
            </p>

            <h2>4. Google prijava — katere podatke zahtevamo</h2>
            <p>
                Ob prijavi preko Google računa zahtevamo dostop do naslednjih,
                omejenih podatkov vašega Google profila:
            </p>
            <ul>
                <li>Vaš e-poštni naslov (za identifikacijo računa)</li>
                <li>Vaše ime in profilna slika (za prikaz v aplikaciji)</li>
            </ul>
            <p>
                Ne zahtevamo in ne dostopamo do vaših osebnih Google Drive datotek,
                e-pošte, koledarja ali drugih Google storitev.
            </p>

            <h2>5. Varnost in hramba podatkov</h2>
            <p>
                Vsi podatki so shranjeni na strežnikih znotraj Evropske unije, zaščiteni
                s standardnimi varnostnimi ukrepi (šifrirana povezava HTTPS, omejen
                dostop na osnovi vlog).
            </p>

            <h2>6. Vaše pravice</h2>
            <p>
                Kadarkoli lahko zahtevate vpogled, popravek ali izbris svojih osebnih
                podatkov, tako da kontaktirate administratorja sistema.
            </p>
            <h2>6. Omejitev odgovornosti</h2>
            <p>
                Aplikacija se zagotavlja &quot;kot je&quot;, brez izrecnih ali impliciranih
                garancij. Podjetje Senzemo ne odgovarja za morebitno izgubo podatkov
                zaradi napačne uporabe sistema.
            </p>
        </div>

    );
}