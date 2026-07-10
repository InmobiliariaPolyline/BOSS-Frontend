const fs = require('fs');
let content = fs.readFileSync('src/app/pages/modal-obra-cliente/modal-obra-cliente.component.html', 'utf8');
content = content.replace(/bg-light/g, 'bg-dark bg-opacity-25');
content = content.replace(/class="form-control bg-white"/g, 'class="pd-input w-100"');
content = content.replace(/class="form-control"/g, 'class="pd-input w-100"');
fs.writeFileSync('src/app/pages/modal-obra-cliente/modal-obra-cliente.component.html', content);
