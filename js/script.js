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

                setupVis2(city_selector, arrest_data);
            });
        
        
        city_selector.addEventListener('change', () => createVis2(city_selector, arrest_data));
    callWhenElementViewable(document.getElementById('race_arrest_vis'), () => createVis2(city_selector, arrest_data))

    let contraband_data = await d3.json('./data/ca_city_data/oakland_contraband.json');
    //console.log(contraband_data);
    setupVis3();
    callWhenElementViewable(document.getElementById('oakland_contraband_vis'), () => createVis3(contraband_data));



    

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


function setupVis2() {
    const width = 800;
    const height = 400;
    const margin = {top: 20, right: 70, bottom: 40, left: 70};

    const svg = d3.select('#race_arrest_vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height);
}


// Create the Bar Chart Visualizatoin
function createVis2(selector, arrest_data) {
    const width = 800;
    const height = 400;
    const margin = {top: 50, right: 70, bottom: 40, left: 70};
    const animation_duration = 800;

    // get the current city selected by the user
    let city = selector.value.toLowerCase().replace(" ", "_");

    const legendData = [
        {label: "Stops" , color: 'gray'},
        {label: 'Arrests', color: 'blue'},
        {label: 'Arrest Rate (%)', color: 'steelblue'}
    ]

    

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

    d3.select('#race_arrest_vis').select('svg').selectAll('g').remove();

    const g = d3.select('#race_arrest_vis').select('svg').append('g')

    // set up labels
    // title
    g.append('text')
        .attr('x', (width) / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
        .text('Total Stops and Arrest Rates Across Races in ' + selector.value)
    
    // left y axis label
    g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', margin.left / 3)
        .text('Total Stops and Arrests');

    // right y axis label
     g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('transform', 'rotate(90)')
        .attr('x', height / 2)
        .attr('y', -(width - margin.right / 2))
        .text('Percentage of Stops Leading to Arrest (%)');
    
    // x axis label
    g.append('text')
        .attr('x', (width) / 2)
        .attr('y', height - margin.bottom / 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .text('Race');


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
    g.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

    // Add left y-axis (stops/arrests)
    g.append("g")
    .attr('transform', `translate(${margin.left})`)
    .call(d3.axisLeft(y_left).ticks(5));

    // Add right y-axis (arrest rate)
    g.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y_right).ticks(5).tickFormat(d => Math.floor(100*d) + "%"));
    
    let left_bar = g.append('g');

    // add total stops bar
    left_bar.selectAll('.stop-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'stop-bar')
            .attr('x', d => x(d.race) + x_sub('total'))
            .attr('y', y_left(0))
            .attr('height', 0)
            .attr('width', x_sub.bandwidth())
            .attr('fill', legendData[0]['color'])
            .transition()
            .duration(animation_duration)
            .attr('height', d => y_left(0) - y_left(d.stopped))
            .attr('y', d => y_left(d.stopped));
            
    
    // add total arrests bar
    left_bar.selectAll('.arrest-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'arrest-bar')
            .attr('x', d => x(d.race) + x_sub('total'))
            .attr('y', y_left(0))
            .attr('width', x_sub.bandwidth())
            .attr('height', 0)
            .attr('fill', legendData[1]['color'])
            .transition()
            .duration(animation_duration)
            .attr('y', d => y_left(d.arrested))
            .attr('height', d => y_left(0) - y_left(d.arrested));
    
    // add tooltips for the left bar
    left_bar.selectAll('.stop-bar').on('mouseover', function(event, d) {
        d3.select('#tooltip_vis_2')
            .style('display', 'block')
            .html(
                `<strong>Race: ${d.race}</strong><br/>
                Total: ${d.stopped}<br/>
                Arrested: ${d.arrested}`
            )
            .style('left', (event.pageX + 20) + "px")
            .style('top', (event.pageY - 28) + "px");

        d3.select(this)
            .style('stroke', 'black')
            .style('stroke-width', '2px');

    }).on('mouseout', function(event, d) {
        d3.select('#tooltip_vis_2')
                    .style('display', 'none');

        d3.select(this)
            .style('stroke-width', '0px');
    });
            

    // add proportion arrested bar
    g.selectAll('.prop-bar')
        .data(bar_data)
        .join('rect')
            .attr('class', 'prop-bar')
            .attr('x', d => x(d.race) + x_sub('proportion'))
            .attr('y', d => y_right(0))
            .attr('width', x_sub.bandwidth())
            .attr('height', 0)
            .attr('fill', legendData[2]['color'])
            .transition()
            .duration(animation_duration)
            .attr('height', d => y_right(0) - y_right(d.arrested / d.stopped))
            .attr('y', d => y_right(d.arrested / d.stopped));

    // add tooltips for the proportion bar
    g.selectAll('.prop-bar').on('mouseover', function(event, d) {
        d3.select('#tooltip_vis_2')
            .style('display', 'block')
            .html(
                `<strong>Race: ${d.race}</strong><br/>
                Proportion: ${Math.round(1000 * d.arrested / d.stopped)/10}%`
            )
            .style('left', (event.pageX + 20) + "px")
            .style('top', (event.pageY - 28) + "px");

        d3.select(this)
            .style('stroke', 'black')
            .style('stroke-width', '2px');
    }).on('mouseout', function(event, d) {
        d3.select('#tooltip_vis_2')
                    .style('display', 'none');

        d3.select(this)
            .style('stroke-width', '0px');
    });

            
    
    // add a legend
    const legend = g.append('g')
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
        .text(d => d['label'])
        .transition()
        .duration(animation_duration)
        .attr('x', 20);
}


function setupVis3() {
    const width = 800;
    const height = 200;
    const margin = {top: 20, right: 50, bottom: 40, left: 50};

    const svg = d3.select('#oakland_contraband_vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background-color', 'gray');

    // dashed white lines
    svg.append("line")
    .attr("x1", 0)
    .attr("y1", height / 4)
    .attr("x2", width)
    .attr("y2", height / 4)
    .attr("stroke", "white")
    .attr("stroke-width", 4)
    .attr("stroke-dasharray", "20,20");

    svg.append("line")
    .attr("x1", 0)
    .attr("y1", 3 * height / 4)
    .attr("x2", width)
    .attr("y2", 3 * height / 4)
    .attr("stroke", "white")
    .attr("stroke-width", 4)
    .attr("stroke-dasharray", "20,20");

    // double yellow line
    svg.append("line")
    .attr("x1", 0)
    .attr("y1", height / 2 - 4)
    .attr("x2", width)
    .attr("y2", height / 2 - 4)
    .attr("stroke", "yellow")
    .attr("stroke-width", 4);

    svg.append("line")
    .attr("x1", 0)
    .attr("y1", height / 2 + 4)
    .attr("x2", width)
    .attr("y2", height / 2 + 4)
    .attr("stroke", "yellow")
    .attr("stroke-width", 4);
            
            
            
    //: './data/images/car_left.png')
}

function createVis3(contraband_data) {
    const width = 800;
    const height = 200;
    const margin = {top: 20, right: 50, bottom: 40, left: 50};

    const g = d3.select('#oakland_contraband_vis').select('svg').append('g');

    // Create 100 cars
    const num_cars = 50;
    const car_width = width / num_cars;
    const car_height = car_width;
    const spacing = width / num_cars;

    const data = d3.range(num_cars).reverse();

    let black_c_data = contraband_data.find(d => d['race'] == 'black');
    let black_percent = Math.round(100 * black_c_data['contraband_found_proportion']);

    let white_c_data = contraband_data.find(d => d['race'] == 'white');
    let white_percent = Math.round(100 * white_c_data['contraband_found_proportion'])

    let row1_red = Math.floor(black_percent / 2);
    let row2_red = row1_red;
    if (black_percent % 2 == 1) {
        row1_red += 1;
    }

    let row3_red = Math.floor(white_percent / 2);
    let row4_red = row3_red;
    if (white_percent % 2 == 1) {
        row3_red += 1;
    }

    console.log(`${row1_red}, ${row2_red}`);

    const row1 = g.append('g')
    row1.selectAll('image')
        .data(data)
        .join('image')
            .attr('xlink:href', (d, i) => (i < row1_red)? './data/images/car_left_red.png' : './data/images/car_left.png')
            .attr('x', width + car_width)
            .attr('y', height / 8 - car_height / 2)
            .attr('width', car_width)
            .attr('height', car_height)
        .transition()
            .delay((d, i) => i * 50)
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr('x', d => width - car_width - d * spacing);
    
    const row2 = g.append('g')
    row2.selectAll('image')
        .data(data)
        .join('image')
            .attr('xlink:href', (d, i) => (i < row2_red)? './data/images/car_left_red.png' : './data/images/car_left.png')
            .attr('x', width)
            .attr('y', 3 * height / 8 - car_height / 2)
            .attr('width', car_width)
            .attr('height', car_height)
        .transition()
            .delay((d, i) => i * 50)
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr('x', d => width - car_width - d * spacing);

    

    const row3 = g.append('g')
    row3.selectAll('image')
        .data(data)
        .join('image')
            .attr('xlink:href', d => (d < row3_red)? './data/images/car_right_red.png' : './data/images/car_right.png')
            .attr('x', -car_width)
            .attr('y', 5 * height / 8 - car_height / 2)
            .attr('width', car_width)
            .attr('height', car_height)
        .transition()
            .delay((d, i) => i * 50)
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr('x', d => d * spacing);
    
    const row4 = g.append('g')
    row4.selectAll('image')
        .data(data)
        .join('image')
            .attr('xlink:href', d => (d < row4_red)? './data/images/car_right_red.png' : './data/images/car_right.png')
            .attr('x', -car_width)
            .attr('y', 7 * height / 8 - car_height / 2)
            .attr('width', car_width)
            .attr('height', car_height)
        .transition()
            .delay((d, i) => i * 50)
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr('x', d => d * spacing);
    
    g.append('text')
        .attr('x', width / 2)
        .attr('y', 13)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .text('Rates of Contraband with Black Drivers');

    g.append('text')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .text('Rates of Contraband with White Drivers');
}


function isElementInView(element) {
    let rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function callWhenElementViewable(element, handler) {

    const handleScrollOnce = (() => {
        let has_run = false;

        return function () {
            if (has_run == false && isElementInView(element)) {
                handler();
                has_run = true;
            }
        }
    });

    window.addEventListener('scroll', handleScrollOnce());
}