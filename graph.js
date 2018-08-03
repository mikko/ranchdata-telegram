const ChartJS = require('chart.js');
const ChartjsNode = require('chartjs-node');

ChartJS.plugins.register({
  beforeDraw: function(chartInstance) {
    var ctx = chartInstance.chart.ctx;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
  }
});

var chartNode = new ChartjsNode(1200, 1200);

// Stupid hack
if (global.CanvasGradient === undefined) {
  global.CanvasGradient = function() {};
}



const getImageStream = (sensorName, timeSeries) => {
  const chartJsOptions = {
    type: 'line',
    data: {
      labels: timeSeries.map(p => new Date(p.measurement_time)),
      datasets: [{
        label: sensorName,
        fill: false,
        borderColor: "rgb(66, 244, 200)",
        backgroundColor: "rgb(66, 244, 200)",
        pointRadius: 0,
        data: timeSeries.map((p, i) => p.value),
      }],
    },
    options: {
      fill: false,
      responsive: true,
      legend: {
        labels: {
          fontSize: 24,
          fontColor: 'black',
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            fontSize: 24,
            fontColor: 'black',
          },
          type: 'time',
          time: {
            unit: 'hour',
            displayFormats: {
                hour: 'H:[00]'
            }
          },
          display: true,
          scaleLabel: {
            display: false,
          }
        }],
        yAxes: [{
          ticks: {
            fontSize: 24,
            fontColor: 'black',
          },
        }]
        
      }
    }
  }
  //console.log(JSON.stringify(chartJsOptions, null, 2));
  //return chartNode.writeImageToFile('image/png', './testimage.png');
  console.log('Drawing chart');
  return chartNode.drawChart(chartJsOptions)
    .then(() => {
      console.log('Chart ready. Returning stream');
      return chartNode.getImageBuffer('image/png');

//      return chartNode.getImageStream('image/png')
    })
}

module.exports = {
  getImageStream
};
