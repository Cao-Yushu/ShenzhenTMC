const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// GitHub配置
const GITHUB_USERNAME = process.env.GITHUB_USERNAME; // 您的GitHub用户名
const GITHUB_REPO = 'Password'; // 您的仓库名
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // GitHub Personal Access Token
const DATA_FILE = 'passwords-data.json';

// GitHub API基础URL
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;

// 从GitHub读取口令数据
async function readPasswordsFromGitHub() {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/${DATA_FILE}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    // 解码base64内容
    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    const data = JSON.parse(content);
    
    return {
      success: true,
      data: data,
      sha: response.data.sha // 需要用于更新文件
    };
  } catch (error) {
    console.error('从GitHub读取数据失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 向GitHub写入口令数据
async function writePasswordsToGitHub(data, sha) {
  try {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    
    const response = await axios.put(`${GITHUB_API_BASE}/${DATA_FILE}`, {
      message: `更新口令使用状态 - ${new Date().toISOString()}`,
      content: content,
      sha: sha
    }, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    return {
      success: true,
      sha: response.data.content.sha
    };
  } catch (error) {
    console.error('向GitHub写入数据失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 健康检查
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '口令分配服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 获取可用口令
app.get('/api/get-password', async (req, res) => {
  try {
    console.log('收到口令请求');
    
    // 从GitHub读取数据
    const readResult = await readPasswordsFromGitHub();
    if (!readResult.success) {
      return res.status(500).json({
        success: false,
        message: '无法读取口令数据',
        password: null
      });
    }
    
    const passwordData = readResult.data;
    const sha = readResult.sha;
    
    // 查找可用口令（注意：used字段值为FALSE字符串）
    const availablePasswords = passwordData.passwords.filter(p => p.used === false || p.used === 'FALSE');
    
    if (availablePasswords.length === 0) {
      return res.json({
        success: false,
        message: '暂无可用口令',
        password: null
      });
    }
    
    // 随机选择一个口令
    const randomIndex = Math.floor(Math.random() * availablePasswords.length);
    const selectedPassword = availablePasswords[randomIndex];
    
    // 标记为已使用
    const passwordIndex = passwordData.passwords.findIndex(p => p.id === selectedPassword.id);
    passwordData.passwords[passwordIndex].used = true;
    passwordData.passwords[passwordIndex].usedAt = new Date().toISOString();
    
    // 更新元数据
    passwordData.metadata.lastUpdated = new Date().toISOString();
    
    // 写入GitHub
    const writeResult = await writePasswordsToGitHub(passwordData, sha);
    if (!writeResult.success) {
      return res.status(500).json({
        success: false,
        message: '无法更新口令状态',
        password: null
      });
    }
    
    console.log(`成功分配口令: ${selectedPassword.code}`);
    
    res.json({
      success: true,
      message: '口令分配成功',
      password: selectedPassword.code
    });
    
  } catch (error) {
    console.error('处理口令请求失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      password: null
    });
  }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const readResult = await readPasswordsFromGitHub();
    if (!readResult.success) {
      return res.status(500).json({
        success: false,
        message: '无法读取统计数据'
      });
    }
    
    const passwordData = readResult.data;
    const total = passwordData.passwords.length;
    const used = passwordData.passwords.filter(p => p.used === true).length;
    const available = total - used;
    
    res.json({
      success: true,
      stats: {
        total,
        used,
        available,
        usageRate: total > 0 ? (used / total * 100).toFixed(2) + '%' : '0%'
      }
    });
    
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 重置所有口令状态（仅用于测试）
app.post('/api/reset-passwords', async (req, res) => {
  try {
    const readResult = await readPasswordsFromGitHub();
    if (!readResult.success) {
      return res.status(500).json({
        success: false,
        message: '无法读取口令数据'
      });
    }
    
    const passwordData = readResult.data;
    const sha = readResult.sha;
    
    // 重置所有口令状态
    passwordData.passwords.forEach(password => {
      password.used = false;
      password.usedAt = null;
    });
    
    passwordData.metadata.lastUpdated = new Date().toISOString();
    
    const writeResult = await writePasswordsToGitHub(passwordData, sha);
    if (!writeResult.success) {
      return res.status(500).json({
        success: false,
        message: '无法重置口令状态'
      });
    }
    
    res.json({
      success: true,
      message: '所有口令状态已重置'
    });
    
  } catch (error) {
    console.error('重置口令状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
  console.log(`GitHub仓库: ${GITHUB_USERNAME}/${GITHUB_REPO}`);
  console.log(`数据文件: ${DATA_FILE}`);
});
