export default function TermsOfService() {
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
            <h1>Pogoji uporabe</h1>
            <p>Zadnja posodobitev: {new Date().toLocaleDateString("sl-SI")}</p>

            <h2>1. Namen aplikacije</h2>
            <p>
                Senzemo Production Tool je interno orodje, namenjeno izključno
                zaposlenim in pooblaščenim uporabnikom podjetja Senzemo za upravljanje
                proizvodnje in zaloge senzorjev.
            </p>

            <h2>2. Dostop</h2>
            <p>
                Dostop do aplikacije je omejen na uporabnike, ki jim je račun ustvaril
                administrator sistema. Samostojna registracija ni mogoča.
            </p>

            <h2>3. Odgovornost uporabnika</h2>
            <p>
                Uporabniki so dolžni skrbeti za varnost svojih prijavnih podatkov in
                obveščati administratorja o morebitnih varnostnih incidentih.
            </p>

            <h2>4. Sprememba pogojev</h2>
            <p>
                Pridržujemo si pravico do sprememb teh pogojev. O bistvenih
                spremembah bomo uporabnike obvestili.
            </p>

            <h2>5. Kontakt</h2>
            <p>Za vprašanja nas kontaktirajte na [vaš kontaktni e-mail].</p>
        </div>
    );
}