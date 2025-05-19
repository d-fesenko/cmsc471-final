// script.js

const race = ['api', 'blk', 'hsp', 'wht', 'na'];
const colorScale = [
  "lightgreen",      // api
  "cornflowerblue",  // blk
  "crimson",         // hsp
  "purple",          // wht
  "black"            // na
];
const options = ['All Populations', 'White', 'Black', 'Hispanic', 'Asian/Pacific Islander'];

async function init() {
  try {
    const us = await d3.json('./data/states-10m.json');
    const data = await d3.json('./data/ca.json');
    createVis(us, data);

    let arrest_data = []
        let city_selector = document.getElementById("cities_vis_2");

        d3.csv("./data/ca_city_data/race_arrest_ca_cities.csv",
            function(d) {
                return d
            }).then(data => {
                console.log(data);
                arrest_data = data;

                createVis2(city_selector, arrest_data);
            });
        
        
        city_selector.addEventListener('change', () => console.log(city_selector.value));
        city_selector.addEventListener('change', () => createVis2(city_selector, arrest_data));


  } catch (err) {
    console.error('Error loading data:', err);
  }
}


function createVis(us, data) {
  const width = 980;
  const height = 680;

  // SVG container
  const svg = d3.select('#vis')
    .append('svg')
      .attr('width', width)
      .attr('height', height)
    .append('g');

  const statesGeo = topojson.feature(us, us.objects.states);
  const projection = d3.geoAlbersUsa()
    .fitExtent([[20, 20], [width - 20, height - 20]], statesGeo);
  const path = d3.geoPath().projection(projection);

  // Draw states fill
  svg.append('g')
    .selectAll('path')
    .data(statesGeo.features)
    .join('path')
      .attr('d', path)
      .attr('fill', 'lightgray');

  // Draw state borders
  svg.append('path')
    .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-linejoin', 'round');

  // Color mapping per option
  const colorMap = {
    'All Populations':        '#888',
    'White':                  colorScale[race.indexOf('wht')],
    'Black':                  colorScale[race.indexOf('blk')],
    'Hispanic':               colorScale[race.indexOf('hsp')],
    'Asian/Pacific Islander': colorScale[race.indexOf('api')]
  };

  // Accessor functions for sizing
  const accessors = {
    'All Populations':        d => d.total_stops,
    'White':                  d => d.total_stops * d.search_wht,
    'Black':                  d => d.total_stops * d.search_blk,
    'Hispanic':               d => d.total_stops * d.search_hsp,
    'Asian/Pacific Islander': d => d.total_stops * d.search_api
  };

  // Shared radius scale based on max total_stops
  const maxStops = d3.max(data, d => d.total_stops);
  const radiusScale = d3.scaleSqrt()
    .domain([0, maxStops])
    .range([5, 25]);

  // Draw circles (initial: All Populations)
  const points = svg.append('g')
    .selectAll('circle')
    .data(data)
    .join('circle')
      .attr('class', 'points')
      .attr('cx', d => projection([d.longitude, d.latitude])[0])
      .attr('cy', d => projection([d.longitude, d.latitude])[1])
      .attr('r', d => radiusScale(accessors['All Populations'](d)))
      .style('fill',   colorMap['All Populations'])
      .style('fill-opacity', '0.75')

  points
    .on('mouseover', function(event, d) {
      const raceLabels  = ['API','Black','Hispanic','White'];
      const searchRates = [d.search_api, d.search_blk, d.search_hsp, d.search_wht];

      d3.select('#tooltip')
        .style('display', 'block')
        .style('left', (event.pageX + 20) + 'px')
        .style('top',  (event.pageY - 28) + 'px');

      d3.select('#tooltip-title').text(`${d.city}: Search Rate by Race`);
      const svgT = d3.select('#tooltip-chart');
      svgT.selectAll('*').remove();

      const margin = {top:10, right:10, bottom:20, left:25};
      const w = +svgT.attr('width')  - margin.left - margin.right;
      const h = +svgT.attr('height') - margin.top  - margin.bottom;

      const xScale = d3.scaleBand()
        .domain(raceLabels)
        .range([0, w])
        .padding(0.1);
      const yScale = d3.scaleLinear()
        .domain([0, d3.max(searchRates)])
        .nice()
        .range([h, 0]);

      const chart = svgT.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      chart.selectAll('rect')
        .data(searchRates)
        .join('rect')
          .attr('x', (_, i) => xScale(raceLabels[i]))
          .attr('y', d => yScale(d))
          .attr('width',  xScale.bandwidth())
          .attr('height', d => h - yScale(d))
          .attr('fill',   (_, i) => colorScale[i]);

      chart.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll('text').style('font-size','10px');

      chart.append('g')
        .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format('.0%')))
        .selectAll('text').style('font-size','10px');
    })
    .on('mouseout', function(event, d) {
      d3.select('#tooltip').style('display','none')
    });

  // Build and populate dropdown
  const dropdown = d3.select('#xVariable');
  dropdown
    .selectAll('option')
    .data(options)
    .join('option')
      .attr('value', d => d)
      .text(d => d);
  dropdown.property('value', 'All Populations');

  // Update circles on race change
  dropdown.on('change', function() {
    const sel      = d3.select(this).property('value');
    const accessor = accessors[sel];
    const col      = colorMap[sel];

    points
      .transition().duration(750)
        .attr('r',    d => radiusScale(accessor(d)))
        .style('fill',   col)
        .style('stroke', col);
  });
}

window.addEventListener('load', init);

function createVis2(selector, arrest_data) {
    const width = 800;
    const height = 400;
    const margin = {top: 20, right: 50, bottom: 40, left: 50};

    // get the current city selected by the user
    let city = selector.value.toLowerCase().replace(" ", "_");

    races = ['white', 'asian/pacific islander', 'black', 'hispanic', 'other']

    // get the data associated with that city
    let data = arrest_data.find(d => d['city'] == city);
    
    let bar_data = races.map(d => {
        return {
            race: d,
            stopped: +data[d],
            arrested: +data[`${d} arrests`]
        }
    });

    console.log(bar_data);

    d3.select('#race_arrest_vis').selectAll('*').remove();

    const svg = d3.select('#race_arrest_vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    

    // outer race groups
    const x = d3.scaleBand()
        .domain(bar_data.map(d => d.race))
        .range([margin.left, width - margin.right])
        .paddingInner(0.2);

    // inner groups for both total numbers and proportions
    const x_sub = d3.scaleBand()
        .domain(['total', 'proportion'])
        .range([0, x.bandwidth()])
        .padding(0.2);

    // left y scale for total numbers
    const y_left = d3.scaleLinear()
        .domain([0, d3.max(bar_data, d => d.stopped)])
        .range([height - margin.bottom, margin.top])
    
    //right y scale for proportion values
    const y_right = d3.scaleLinear()
        .domain([0, d3.max(bar_data, d => d.arrested / d.stopped)])
        .range([height - margin.bottom, margin.top])

    // Add x-axis
    svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

    // Add left y-axis (stops/arrests)
    svg.append("g")
    .attr('transform', `translate(${margin.left})`)
    .call(d3.axisLeft(y_left).ticks(5));

    // Add right y-axis (arrest rate)
    svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y_right).ticks(5).tickFormat(d => d + "%"));
    

    // add total stops bar
    svg.selectAll('.stop-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'stop-bar')
            .attr('x', d => x(d.race) + x_sub('total'))
            .attr('y', d => y_left(d.stopped))
            .attr('height', d => y_left(0) - y_left(d.stopped))
            .attr('width', x_sub.bandwidth())
            .attr('fill', legendData[0]['color']);
    
    // add total arrests bar
    svg.selectAll('.arrest-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'arrest-bar')
            .attr('x', d => x(d.race) + x_sub('total'))
            .attr('y', d => y_left(d.arrested))
            .attr('height', d => y_left(0) - y_left(d.arrested))
            .attr('width', x_sub.bandwidth())
            .attr('fill', legendData[1]['color']);

    // add proportion arrested bar
    svg.selectAll('.prop-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'prop-bar')
            .attr('x', d => x(d.race) + x_sub('proportion'))
            .attr('y', d => y_right(d.arrested / d.stopped))
            .attr('height', d => y_right(0) - y_right(d.arrested / d.stopped))
            .attr('width', x_sub.bandwidth())
            .attr('fill', legendData[2]['color']);
    
    // add a legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.left - margin.right - 100}, ${margin.top})`);
    
    legend.selectAll('rect')
        .data(legendData)
        .join('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => d['color'])
    
    legend.selectAll('text')
        .data(legendData)
        .join('text')
        .attr('x', 20)
        .attr('y', (d, i) => i * 20 + 10)
        .text(d => d['label']);
}


const legendData = [
    {label: "Stops" , color: 'gray'},
    {label: 'Arrests', color: 'blue'},
    {label: 'Arrest Rate (%)', color: 'steelblue'}
]


