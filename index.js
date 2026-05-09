const express = require('express');
const { Wallet, JsonRpcProvider, parseEther } = require('ethers');
require('dotenv').config();

const app = express();
app.use(require('cors')());
app.use(express.json());

const provider = new JsonRpcProvider('http://localhost:9545');
const wallet = new Wallet(process.env.FAUCET_PRIVATE_KEY, provider);

app.post('/api/faucet', async (req, res) => {
    const { address } = req.body;
    try {
        const tx = await wallet.sendTransaction({
            to: address,
            value: parseEther('0.1')
        });
        res.json({ success: true, tx: tx.hash });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(8080, () => console.log('Faucet running on 8080'));
