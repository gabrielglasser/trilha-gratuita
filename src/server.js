import {createApp} from './app.js';
const port=Number(process.env.PORT||3000);
createApp().listen(port,'0.0.0.0',()=>console.log(`Trilha Gratuita disponível na porta ${port}. Modo: ${process.env.DATA_MODE==='real'?'real':'teste'}.`));
