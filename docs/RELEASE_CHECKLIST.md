# Checklist de sortie

## Validation technique

- [x] `npm run build` réussit.
- [x] `node_modules`, `dist` et `*.tsbuildinfo` sont ignorés.
- [ ] Test d’écriture de 60 minutes sur Xiaomi Pad.
- [ ] Test du rejet de paume.
- [ ] Test import puis export d’un PDF de 10 pages.
- [ ] Test sauvegarde puis restauration JSON.
- [ ] Test création, renommage, duplication, déplacement et suppression des pages.
- [ ] Test hors ligne après installation PWA.

## Critères bloquants

La sortie est bloquée uniquement par :

- perte de notes ;
- plantage pendant l’écriture ;
- export ou restauration inutilisable ;
- rejet de paume empêchant une prise de notes normale.
