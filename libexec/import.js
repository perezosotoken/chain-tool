const dotEnv = require('dotenv');
dotEnv.config();

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const artifact = require("../StakingRewardsV3.json");
const ERC20ABI = require("../TokenABI.json");

const perezosoMock = "0xD83207C127c910e597b8ce77112ED0a56c8C9CD0";
const contractAddress = '0x6D1912AD305D7c31B058453Fb4D1c9F8F0B5192B';
const provider = new ethers.providers.JsonRpcProvider('https://bsc-mainnet.core.chainstack.com/32c23cdae55f05b0d3fa18dff9dc5070');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, artifact.abi, signer);

async function readStakesData() {
    const filePath = path.join(__dirname, '../output.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

async function prepareImportData() {
    const stakesData = await readStakesData();
    const stakerAddresses = [];
    const stakeAmounts = [];
    const lockPeriodsArrays = [];

    stakesData.forEach(staker => {
        stakerAddresses.push(staker.address);

        const amounts = [];
        const periods = [];
        const earned = [];

        staker.stakes.forEach(stake => {
            amounts.push(stake.totalStaked.toString()); // Convert to string if BigNumber is required
            periods.push(stake.lockTime.toString()); // Convert to string if necessary
            earned.push(stake.totalEarnedPerStake.toString());
        });

        stakeAmounts.push(amounts);
        lockPeriodsArrays.push(periods);
    });

    return { stakerAddresses, stakeAmounts, lockPeriodsArrays };
}

async function importStakesToContract() {
    // const { stakerAddresses, stakeAmounts, lockPeriodsArrays } = await prepareImportData();

    const stakerAddresses = ['0xD3E7943a6C9dB663c9fb9B3340209A7c9d56E7Dd'];
    const lockPeriodsArrays = [['2592000', '7776000']];
    const earned = [['10000000000000000000000000000','20000000000000000000000000000']];
    const totalRewardsPaid = ["100000000000000000000000000"];
    const stakeAmounts = [['1000000000000000000000000000000', '2000000000000000000000000000000']];

    try {
        const tx = await contract.importStakes(stakerAddresses, stakeAmounts, lockPeriodsArrays, earned, totalRewardsPaid);
        console.log('Transaction hash:', tx.hash);
        await tx.wait();
        console.log('Stakes imported successfully');
    } catch (error) {
        console.error('Failed to import stakes:', error);
    }
}

const run = async () => {
    const { stakerAddresses, stakeAmounts, lockPeriodsArrays } = await prepareImportData();

    console.log(stakerAddresses);
    console.log(stakeAmounts);
    console.log(lockPeriodsArrays);

    const perezosoTokenMock = new ethers.Contract(perezosoMock, ERC20ABI, signer);
    const allowance = await perezosoTokenMock.allowance(contractAddress, contractAddress);

    await perezosoTokenMock.approve(contractAddress, ethers.constants.MaxUint256);

    await importStakesToContract();
}

run();