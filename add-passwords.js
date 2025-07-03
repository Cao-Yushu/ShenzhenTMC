

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 您的口令清单 - 请在这里添加您的口令
const passwords = [
  'HONGBAO001',
  'HONGBAO002',
  'HONGBAO003',
  'LUCKY2024',
  'SURVEY001',
  'GIFT001',
  'REWARD001',
  'BONUS001',
  'PRIZE001',
  'MONEY001',
  // 在这里添加更多口令...
];

async function addPasswords() {
  try {
    const client = await pool.connect();
    
    console.log('开始添加口令...');
    let successCount = 0;
    let failCount = 0;
    
    for (const password of passwords) {
      try {
        await client.query(
          'INSERT INTO passwords (password) VALUES ($1)',
          [password]
        );
        console.log(`✅ 成功添加: ${password}`);
        successCount++;
      } catch (err) {
        console.log(`❌ 添加失败: ${password} - ${err.message}`);
        failCount++;
      }
    }
    
    client.release();
    
    console.log('\n📊 添加完成统计:');
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    console.log(`总计: ${passwords.length} 个`);
    
    // 显示当前统计信息
    const totalResult = await pool.query('SELECT COUNT(*) FROM passwords');
    const usedResult = await pool.query('SELECT COUNT(*) FROM passwords WHERE is_used = TRUE');
    const total = parseInt(totalResult.rows[0].count);
    const used = parseInt(usedResult.rows[0].count);
    const available = total - used;
    
    console.log('\n📈 当前数据库状态:');
    console.log(`总口令数: ${total}`);
    console.log(`已使用: ${used}`);
    console.log(`可用: ${available}`);
    console.log(`使用率: ${total > 0 ? (used / total * 100).toFixed(2) + '%' : '0%'}`);
    
  } catch (err) {
    console.error('添加口令失败:', err);
  } finally {
    await pool.end();
  }
}

// 如果直接运行这个脚本
if (require.main === module) {
  addPasswords();
}

module.exports = { addPasswords };

->

// 将CSV口令转换为JSON格式的脚本
// 使用方法：node add-passwords.js

const fs = require('fs').promises;
const path = require('path');

// 您的口令清单 - 请在这里添加您的口令
const passwords = [
  'A1B2C3D',
  'E4F5G6H',
  'I7J8K9L',
  'M0N1O2P',
  'Q3R4S5T',
  'U6V7W8X',
  'Y9Z0A1B',
  'C2D3E4F',
  'G5H6I7J',
  'K8L9M0N',
  // 在这里添加更多口令...
  // 或者从CSV文件读取
];

// 从CSV文件读取口令
async function readPasswordsFromCSV(csvFile) {
  try {
    const data = await fs.readFile(csvFile, 'utf8');
    const lines = data.split('\n');
    
    // 假设第一行是标题，跳过
    const passwords = lines.slice(1)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return passwords;
  } catch (error) {
    console.error('读取CSV文件失败:', error);
    return [];
  }
}

// 生成JSON格式的口令数据
async function generatePasswordsJSON(passwords) {
  const passwordData = {
    metadata: {
      totalCount: passwords.length,
      createdDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      version: "1.0"
    },
    passwords: passwords.map((password, index) => ({
      id: index + 1,
      password: password,
      used: false,
      usedAt: null
    }))
  };
  
  return passwordData;
}

// 保存JSON文件
async function savePasswordsJSON(data, filename = 'passwords-data.json') {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`✅ 成功保存到: ${filename}`);
    return true;
  } catch (error) {
    console.error('保存JSON文件失败:', error);
    return false;
  }
}

// 主函数
async function processPasswords() {
  try {
    console.log('开始处理口令数据...');
    
    let passwordList = passwords;
    
    // 如果存在CSV文件，则从CSV读取
    const csvFile = 'passwords.csv';
    if (await fs.access(csvFile).then(() => true).catch(() => false)) {
      console.log('发现CSV文件，从CSV读取口令...');
      passwordList = await readPasswordsFromCSV(csvFile);
    } else {
      console.log('未发现CSV文件，使用代码中的口令列表...');
    }
    
    if (passwordList.length === 0) {
      console.log('❌ 没有找到任何口令');
      return;
    }
    
    console.log(`📊 找到 ${passwordList.length} 个口令`);
    
    // 生成JSON数据
    const jsonData = await generatePasswordsJSON(passwordList);
    
    // 保存JSON文件
    const success = await savePasswordsJSON(jsonData);
    
    if (success) {
      console.log('\n📈 处理完成统计:');
      console.log(`总口令数: ${jsonData.metadata.totalCount}`);
      console.log(`已使用: 0`);
      console.log(`可用: ${jsonData.metadata.totalCount}`);
      console.log(`创建日期: ${jsonData.metadata.createdDate}`);
      console.log('\n🔧 下一步操作:');
      console.log('1. 将生成的 passwords-data.json 文件上传到GitHub');
      console.log('2. 配置环境变量');
      console.log('3. 部署到Heroku');
    }
    
  } catch (error) {
    console.error('处理口令失败:', error);
  }
}

// 如果直接运行这个脚本
if (require.main === module) {
  processPasswords();
}

module.exports = { processPasswords, generatePasswordsJSON };
