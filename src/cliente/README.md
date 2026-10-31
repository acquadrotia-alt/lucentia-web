# Zona del cliente

Tutto ciò che è **specifico di questa installazione** vive qui (frontend) e in
`server/cliente/` (API). Il ceppo Lucentia non modifica mai queste cartelle, così
`git merge upstream/main` porta gli aggiornamenti del core senza conflitti.

| File | A cosa serve |
|---|---|
| `moduli.js` | Moduli e integrazioni su misura. Ogni voce diventa un interruttore nel portale Lucentia e si legge nel gestionale con `useMods().has("chiave")`. |
| `index.jsx` | `ESTENSIONI`: viste in più nel gestionale, sezioni in più nelle Impostazioni, blocchi nella scheda cliente e nel dettaglio appuntamento, personalizzazioni del sito del salone (home sostitutiva, sezioni, pagine), tema. |
| `../../server/cliente/rotte.js` | Rotte API su misura sotto `/api/cliente/*`. |

## Esempio: una vista "Magazzino fornitori" visibile solo col modulo acceso

`moduli.js`
```js
export const MODULI_CLIENTE = [
  { key: "fornitori", label: "Fornitori", desc: "Ordini e consegne dei fornitori." },
];
```

`index.jsx`
```jsx
import { Truck } from "lucide-react";
import Fornitori from "./Fornitori.jsx";
export const ESTENSIONI = {
  moduli: MODULI_CLIENTE,
  viste: [{ id: "fornitori", label: "Fornitori", icon: Truck, componente: Fornitori, modulo: "fornitori" }],
  …
};
```

Il componente riceve `config, saveConfig, bookings, setBookings, clients, setClients,
catalog, setCatalog, sales, setSales, vouchers, setVouchers, eventi, setEventi, azienda`.
Per dati propri usa una collezione esistente (es. una chiave in `config`) oppure
una tabella creata con una `migrazione-cliente-*.sql` e letta da `server/cliente/rotte.js`.

Dopo il primo contatto con il portale la voce "Fornitori" compare fra gli
interruttori dell'installazione nel pannello Lucentia: accesa → la vista appare.
