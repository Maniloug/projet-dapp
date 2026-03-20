// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotePresidentiel {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    uint256 public cooldown = 3 minutes;

    Candidate[] private candidates;
    mapping(address => uint256) public lastVoteTime;

    event VoteRecorded(address indexed voter, uint256 indexed candidateIndex, uint256 timestamp);

    constructor() {
        candidates.push(Candidate("Leon Blum", 0));
        candidates.push(Candidate("Jacques Chirac", 0));
        candidates.push(Candidate("Francois Mitterrand", 0));
    }

    function getCandidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 index) external view returns (string memory, uint256) {
        require(index < candidates.length, "Candidat invalide");
        Candidate memory c = candidates[index];
        return (c.name, c.voteCount);
    }

    function getTimeUntilNextVote(address user) external view returns (uint256) {
        uint256 nextVoteTime = lastVoteTime[user] + cooldown;

        if (lastVoteTime[user] == 0 || block.timestamp >= nextVoteTime) {
            return 0;
        }

        return nextVoteTime - block.timestamp;
    }

    function vote(uint256 candidateIndex) external {
        require(candidateIndex < candidates.length, "Candidat invalide");
        require(
            lastVoteTime[msg.sender] == 0 || block.timestamp >= lastVoteTime[msg.sender] + cooldown,
            "Wait before voting again"
        );

        candidates[candidateIndex].voteCount += 1;
        lastVoteTime[msg.sender] = block.timestamp;

        emit VoteRecorded(msg.sender, candidateIndex, block.timestamp);
    }
}