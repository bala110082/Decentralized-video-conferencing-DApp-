// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract UPC {
    // User data
    struct User {
        string name;
        Friend[] friendList;
    }

    // User Friend info
    struct Friend {
        address friendAddress;
        string name;
    }

    // User log maintenance
    struct Log {
        address caller;
        address receiver;
        uint256 timestamp;
    }

    // Session timing
    struct CallTime {
        uint start;
        uint end;
    }

    // Name and user address storage
    struct AllUserStruct {
        string name;
        address accountAddress;
    }

    AllUserStruct[] private getAllUsers; // Holds all registered users
    
    mapping(address => User) private userList;
    mapping(uint => Log) private userLog;
    mapping(address => CallTime) private activeCalls;
    uint256 public logCount = 0;

    // Check if user is registered
    function checkUserRegister(address pubKey) public view returns (bool) {
        return bytes(userList[pubKey].name).length > 0;
    }

    // Register user
    function userRegister(string calldata name) external {
        require(!checkUserRegister(msg.sender), "User already exists");
        require(bytes(name).length > 0, "User name cannot be empty");
        userList[msg.sender].name = name;
        getAllUsers.push(AllUserStruct(name, msg.sender));
    }

    // Get username
    function getUsername(address pubKey) external view returns (string memory) {
        require(checkUserRegister(pubKey), "User not registered");
        return userList[pubKey].name;
    }

    // Get all registered users
    function getAllRegisteredUsers() external view returns (AllUserStruct[] memory) {
        return getAllUsers;
    }

    // Add friends
    function addFriend(address friendKey, string calldata name) external {
        require(checkUserRegister(msg.sender), "Create an account first");
        require(checkUserRegister(friendKey), "User is not registered");
        require(msg.sender != friendKey, "User can't add themselves as a friend");
        require(!checkAlreadyFriends(msg.sender, friendKey), "These users are already friends");

        _addFriend(msg.sender, friendKey, name);
        _addFriend(friendKey, msg.sender, userList[msg.sender].name);
    }

    // Remove friend
    function removeFriend(address friendKey) external {
        require(checkUserRegister(msg.sender), "Create an account first");
        require(checkUserRegister(friendKey), "User is not registered");
        require(checkAlreadyFriends(msg.sender, friendKey), "Users are not friends");

        _removeFriend(msg.sender, friendKey);
        _removeFriend(friendKey, msg.sender);
    }

    // Check if already friends
    function checkAlreadyFriends(address pubKey1, address pubKey2) internal view returns (bool) {
        for (uint256 i = 0; i < userList[pubKey1].friendList.length; i++) {
            if (userList[pubKey1].friendList[i].friendAddress == pubKey2) return true;
        }
        return false;
    }

    function _addFriend(address me, address friendKey, string memory name) internal {
        userList[me].friendList.push(Friend(friendKey, name));
    }

    function _removeFriend(address me, address friendKey) internal {
        uint256 len = userList[me].friendList.length;
        for (uint256 i = 0; i < len; i++) {
            if (userList[me].friendList[i].friendAddress == friendKey) {
                userList[me].friendList[i] = userList[me].friendList[len - 1];
                userList[me].friendList.pop();
                break;
            }
        }
    }

    function getMyFriendList() external view returns (Friend[] memory) {
        return userList[msg.sender].friendList;
    }

    // Call logging
    function addCallLog(address receiver) external {
        require(checkUserRegister(msg.sender), "Caller is not registered");
        require(checkUserRegister(receiver), "Receiver is not registered");

        userLog[logCount] = Log(msg.sender, receiver, block.timestamp);
        logCount++;
    }

    function getCallLog(uint256 logId) external view returns (address, address, uint256) {
        require(logId < logCount, "Invalid log ID");
        Log memory logEntry = userLog[logId];
        return (logEntry.caller, logEntry.receiver, logEntry.timestamp);
    }

    // Call session tracking
    function startCall() external {
        require(checkUserRegister(msg.sender), "User is not registered");
        require(activeCalls[msg.sender].start == 0, "Call already started");

        activeCalls[msg.sender] = CallTime(block.timestamp, 0);
    }

    function endCall() external {
        require(checkUserRegister(msg.sender), "User is not registered");
        require(activeCalls[msg.sender].start != 0, "No active call");

        activeCalls[msg.sender].end = block.timestamp;
    }

    function getCallDuration(address user) external view returns (uint256) {
        require(checkUserRegister(user), "User is not registered");
        require(activeCalls[user].end != 0, "Call not ended yet");

        return activeCalls[user].end - activeCalls[user].start;
    }
}
