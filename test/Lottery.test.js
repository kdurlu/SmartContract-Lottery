const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const { abi, evm } = require('../compile');

const web3 = new Web3(ganache.provider());

let lottery;
let accounts;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(abi)
                            .deploy({ data: evm.bytecode.object })
                            .send({ from: accounts[0], gas: '1000000' });
})

describe('Lottery', () => {
    
    it('deploy the contract', () => {
        assert.ok(lottery.options.address);
    });

    it('enter above min value', async () => {
        await lottery.methods.enterLottery().send({
            from: accounts[0],
            value: web3.utils.toWei('0.015', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('enter below min value', async () => {
        try {
            await lottery.methods.enterLottery().send({
                from: accounts[0],
                value: web3.utils.toWei('0.005', 'ether')
            });
            assert(false);
        } catch (e) {
            assert(e);
        }
    });

    it('enter multiple accounts', async () => {
        await lottery.methods.enterLottery().send({
            from: accounts[0],
            value: web3.utils.toWei('0.015', 'ether')
        });

        await lottery.methods.enterLottery().send({
            from: accounts[1],
            value: web3.utils.toWei('0.015', 'ether')
        });

        await lottery.methods.enterLottery().send({
            from: accounts[2],
            value: web3.utils.toWei('0.015', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('prevent non-manager to call pickWinner', async () => {
        try {
            await lottery.methods.pickWinner().send({
                from: accounts[1]
            });
            assert(false);
        } catch (e) {
            assert(e);
        }
    });

    it('send money to winner and reset contract state', async () => {
        await lottery.methods.enterLottery().send({
            from: accounts[0],
            value: web3.utils.toWei('2', 'ether')
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });

        const finalBalance = await web3.eth.getBalance(accounts[0]);
        const diff = finalBalance - initialBalance;

        assert(diff > web3.utils.toWei('1.8', 'ether'));
    });

})