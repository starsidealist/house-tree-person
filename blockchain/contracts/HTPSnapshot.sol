// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HTPSnapshot
 * @notice 房树人·情绪显影 — 分析结果上链存证合约
 * @dev 将 AI 分析结果记录到 Monad 链上，保证数据不可篡改
 */
contract HTPSnapshot {
    /// @notice 单条分析记录
    struct Record {
        uint256 id;              // 记录编号
        address owner;           // 记录所有者
        string imageCid;         // 图片 IPFS CID / 内容标识
        string summary;          // AI 分析摘要（前 200 字符）
        string fullAnalysis;     // 完整分析文本
        uint256 timestamp;       // 记录时间戳
        bool exists;             // 记录是否存在
    }

    /// @notice 记录总数
    uint256 private _recordCount;

    /// @notice 记录 ID → 记录详情
    mapping(uint256 => Record) private _records;

    /// @notice 用户 → 该用户的记录 ID 列表
    mapping(address => uint256[]) private _userRecords;

    /// @notice 事件：新记录创建
    event RecordCreated(
        uint256 indexed id,
        address indexed owner,
        string imageCid,
        uint256 timestamp
    );

    /// @notice 创建一条新的分析记录
    /// @param imageCid 图片内容标识
    /// @param summary 分析摘要（建议 ≤ 200 字符）
    /// @param fullAnalysis 完整分析文本
    /// @return recordId 新记录的 ID
    function createRecord(
        string calldata imageCid,
        string calldata summary,
        string calldata fullAnalysis
    ) external returns (uint256 recordId) {
        _recordCount++;
        uint256 newId = _recordCount;

        _records[newId] = Record({
            id: newId,
            owner: msg.sender,
            imageCid: imageCid,
            summary: summary,
            fullAnalysis: fullAnalysis,
            timestamp: block.timestamp,
            exists: true
        });

        _userRecords[msg.sender].push(newId);

        emit RecordCreated(newId, msg.sender, imageCid, block.timestamp);
        return newId;
    }

    /// @notice 查询单条记录（含 exists 校验）
    function getRecord(uint256 recordId) external view returns (Record memory) {
        require(_records[recordId].exists, "Record does not exist");
        return _records[recordId];
    }

    /// @notice 查询当前调用者的所有记录 ID
    function getMyRecordIds() external view returns (uint256[] memory) {
        return _userRecords[msg.sender];
    }

    /// @notice 查询指定用户的所有记录 ID
    function getRecordIdsByOwner(address owner) external view returns (uint256[] memory) {
        return _userRecords[owner];
    }

    /// @notice 查询记录总数
    function totalRecords() external view returns (uint256) {
        return _recordCount;
    }

    /// @notice 查询当前调用者的记录数量
    function myRecordCount() external view returns (uint256) {
        return _userRecords[msg.sender].length;
    }
}
