import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// Export data to PDF with professional styling
export const exportToPDF = async (data) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(25, 118, 210);
  pdf.text('Attendance Analytics Report', 20, 25);
  
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${format(new Date(), 'PPPp')}`, 20, 35);
  
  // Line separator
  pdf.setDrawColor(25, 118, 210);
  pdf.line(20, 40, pageWidth - 20, 40);
  
  let yPos = 50;
  
  // Live Statistics
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Current Statistics', 20, yPos);
  yPos += 15;
  
  const stats = [
    [`Present: ${data.liveStats.currentlyPresent}/${data.liveStats.totalEmployees}`, `Rate: ${Math.round((data.liveStats.currentlyPresent / data.liveStats.totalEmployees) * 100)}%`],
    [`On Time: ${data.liveStats.onTimeToday}`, `Productivity: ${data.liveStats.productivityScore}%`],
    [`Average Arrival: ${data.liveStats.averageArrival}`, `Anomalies: ${data.anomalies.length}`],
  ];
  
  pdf.setFontSize(10);
  stats.forEach(([left, right]) => {
    pdf.text(left, 25, yPos);
    pdf.text(right, 120, yPos);
    yPos += 8;
  });
  
  yPos += 10;
  
  // Department Performance
  pdf.setFontSize(16);
  pdf.text('Department Performance', 20, yPos);
  yPos += 15;
  
  pdf.setFontSize(10);
  data.productivity.departments.forEach(dept => {
    pdf.text(`${dept.name}: ${dept.score}% (${dept.trend})`, 25, yPos);
    yPos += 8;
  });
  
  // Anomalies
  if (data.anomalies.length > 0) {
    yPos += 10;
    pdf.setFontSize(16);
    pdf.setTextColor(255, 152, 0);
    pdf.text('Detected Anomalies', 20, yPos);
    yPos += 15;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    data.anomalies.forEach(anomaly => {
      pdf.text(`[${anomaly.severity.toUpperCase()}] ${anomaly.user}`, 25, yPos);
      yPos += 5;
      const lines = pdf.splitTextToSize(anomaly.description, pageWidth - 50);
      lines.forEach(line => {
        pdf.text(line, 30, yPos);
        yPos += 4;
      });
      yPos += 5;
    });
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Biometric Attendance System - Confidential', 20, 280);
  
  const fileName = `attendance-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
  return fileName;
};

// Export to Excel with multiple sheets
export const exportToExcel = (data) => {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['ATTENDANCE ANALYTICS SUMMARY'],
    ['Generated:', format(new Date(), 'PPPp')],
    [''],
    ['METRIC', 'VALUE'],
    ['Total Employees', data.liveStats.totalEmployees],
    ['Currently Present', data.liveStats.currentlyPresent],
    ['Attendance Rate', `${Math.round((data.liveStats.currentlyPresent / data.liveStats.totalEmployees) * 100)}%`],
    ['On Time Today', data.liveStats.onTimeToday],
    ['Productivity Score', `${data.liveStats.productivityScore}%`],
    [''],
    ['DEPARTMENT PERFORMANCE'],
    ['Department', 'Score (%)', 'Trend'],
    ...data.productivity.departments.map(dept => [dept.name, dept.score, dept.trend])
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Daily Trends
  const trendsData = [
    ['Date', 'Attendance %', 'On Time %', 'Productivity %'],
    ...data.dailyTrends.map(day => [day.date, day.attendance, day.onTime, day.productivity])
  ];
  const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
  XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Daily Trends');
  
  // Employee Performance
  const employeeData = [
    ['Employee', 'Department', 'Attendance %', 'Productivity %', 'Streak'],
    ...data.userStats.map(user => [user.name, user.department, user.attendance, user.productivity, user.streak])
  ];
  const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
  XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employees');
  
  // Anomalies
  if (data.anomalies.length > 0) {
    const anomaliesData = [
      ['Date', 'Severity', 'User', 'Description'],
      ...data.anomalies.map(a => [a.date, a.severity, a.user, a.description])
    ];
    const anomaliesSheet = XLSX.utils.aoa_to_sheet(anomaliesData);
    XLSX.utils.book_append_sheet(workbook, anomaliesSheet, 'Anomalies');
  }
  
  const fileName = `attendance-analytics-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
};

// Export to CSV
export const exportToCSV = (data, type = 'summary') => {
  let csvContent = '';
  let fileName = '';
  
  if (type === 'summary') {
    fileName = `attendance-summary-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    const rows = [
      ['METRIC', 'VALUE'],
      ['Generated', format(new Date(), 'PPPp')],
      ['Total Employees', data.liveStats.totalEmployees],
      ['Currently Present', data.liveStats.currentlyPresent],
      ['Attendance Rate', `${Math.round((data.liveStats.currentlyPresent / data.liveStats.totalEmployees) * 100)}%`],
      ['On Time Today', data.liveStats.onTimeToday],
      ['Productivity Score', `${data.liveStats.productivityScore}%`],
      [''],
      ['DEPARTMENT', 'SCORE', 'TREND'],
      ...data.productivity.departments.map(dept => [dept.name, `${dept.score}%`, dept.trend])
    ];
    csvContent = rows.map(row => row.join(',')).join('\n');
  } else if (type === 'daily') {
    fileName = `attendance-daily-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    const rows = [
      ['Date', 'Attendance %', 'On Time %', 'Productivity %'],
      ...data.dailyTrends.map(day => [day.date, day.attendance, day.onTime, day.productivity])
    ];
    csvContent = rows.map(row => row.join(',')).join('\n');
  } else if (type === 'employees') {
    fileName = `employee-performance-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    const rows = [
      ['Employee', 'Department', 'Attendance %', 'Productivity %', 'Streak'],
      ...data.userStats.map(user => [user.name, user.department, user.attendance, user.productivity, user.streak])
    ];
    csvContent = rows.map(row => row.join(',')).join('\n');
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
  return fileName;
};

// Generate automated reports
export const generateAutomatedReport = (data, period = 'weekly') => {
  const report = {
    title: `${period.charAt(0).toUpperCase() + period.slice(1)} Attendance Report`,
    generated: format(new Date(), 'PPPp'),
    period,
    summary: {
      totalEmployees: data.liveStats.totalEmployees,
      avgAttendance: Math.round(data.dailyTrends.reduce((sum, day) => sum + day.attendance, 0) / data.dailyTrends.length),
      avgProductivity: Math.round(data.dailyTrends.reduce((sum, day) => sum + day.productivity, 0) / data.dailyTrends.length),
      anomaliesCount: data.anomalies.length,
      topPerformer: data.userStats.reduce((top, user) => 
        user.productivity > (top?.productivity || 0) ? user : top, null
      )
    },
    recommendations: generateRecommendations(data),
    trends: analyzeTrends(data)
  };
  
  return report;
};

// Generate insights and recommendations
const generateRecommendations = (data) => {
  const recommendations = [];
  
  // Attendance recommendations
  const avgAttendance = data.dailyTrends.reduce((sum, day) => sum + day.attendance, 0) / data.dailyTrends.length;
  if (avgAttendance < 85) {
    recommendations.push({
      type: 'attendance',
      priority: 'high',
      title: 'Low Attendance Rate',
      description: `Average attendance is ${avgAttendance.toFixed(1)}%. Consider implementing attendance incentives.`
    });
  }
  
  // Productivity recommendations
  const lowProdDepts = data.productivity.departments.filter(dept => dept.score < 80);
  if (lowProdDepts.length > 0) {
    recommendations.push({
      type: 'productivity',
      priority: 'medium',
      title: 'Productivity Concerns',
      description: `${lowProdDepts.map(d => d.name).join(', ')} showing low productivity. Consider training programs.`
    });
  }
  
  // Anomaly recommendations
  if (data.anomalies.length > 0) {
    const highSeverity = data.anomalies.filter(a => a.severity === 'high');
    if (highSeverity.length > 0) {
      recommendations.push({
        type: 'anomaly',
        priority: 'high',
        title: 'Critical Anomalies Detected',
        description: `${highSeverity.length} high-priority anomalies require immediate attention.`
      });
    }
  }
  
  return recommendations;
};

// Analyze trends
const analyzeTrends = (data) => {
  const trends = [];
  
  // Weekly pattern analysis
  const weeklyAvg = data.weeklyStats.reduce((sum, day) => sum + day.attendance, 0) / data.weeklyStats.length;
  const weekendAvg = (data.weeklyStats[5].attendance + data.weeklyStats[6].attendance) / 2; // Sat, Sun
  
  if (weekendAvg < weeklyAvg * 0.6) {
    trends.push({
      type: 'pattern',
      insight: 'Significant weekend attendance drop',
      impact: 'Weekend productivity may be affected'
    });
  }
  
  // Productivity trends
  const productivityTrend = data.productivity.departments.filter(dept => 
    dept.trend.startsWith('+')
  ).length / data.productivity.departments.length;
  
  if (productivityTrend > 0.7) {
    trends.push({
      type: 'productivity',
      insight: 'Positive productivity trend across departments',
      impact: 'Overall organizational efficiency improving'
    });
  }
  
  return trends;
};

// Batch export all formats
export const exportAllFormats = async (data) => {
  try {
    const results = {
      pdf: await exportToPDF(data),
      excel: exportToExcel(data),
      csvSummary: exportToCSV(data, 'summary'),
      csvDaily: exportToCSV(data, 'daily'),
      csvEmployees: exportToCSV(data, 'employees')
    };
    
    return results;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};
 