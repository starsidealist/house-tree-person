// HTPSnapshot 合约配置
export const CONTRACT_ADDRESS = '0xA9C282286476e013d0BDB76aD741346523321eF0';

export const CONTRACT_ABI = [
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"imageCid","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"RecordCreated","type":"event"},
  {"inputs":[{"internalType":"string","name":"imageCid","type":"string"},{"internalType":"string","name":"summary","type":"string"},{"internalType":"string","name":"fullAnalysis","type":"string"}],"name":"createRecord","outputs":[{"internalType":"uint256","name":"recordId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"getMyRecordIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"recordId","type":"uint256"}],"name":"getRecord","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"string","name":"imageCid","type":"string"},{"internalType":"string","name":"summary","type":"string"},{"internalType":"string","name":"fullAnalysis","type":"string"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct HTPSnapshot.Record","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalRecords","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];
