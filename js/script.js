const race = ['api', 'blk', 'hsp', 'wht', 'na']
const colorScale = ["lightgreen", "cornflowerblue", "crimson", "purple", "black"]//d3.scaleOrdinal(race, d3.schemeSet2); // d3.schemeSet2 is a set of predefined colors. 
const options = ['All Populations', 'Black', 'Hispanic', 'Asian/Pacific Islander']

function createVis(map, data) {
    // We'll build our visualization here
    const width = 980;
    const height = 680;
  
    const svg = d3.select('#vis')
   .append('svg')
   .attr('width', width)
   .attr('height', height)
   .append('g');
    // we use a square canvas 
   //.attr('transform', `translate(${width / 2},${height / 2})`);

   const path = d3.geoPath();

   const g = svg.append("g");

   const projection = d3
    .geoMercator()
    .center([-119, 37.4])
    .scale((1 << 18) / (28 * Math.PI))
    .translate([320, 320])

  const pathGenerator = d3.geoPath(projection);

  svg.append("path")
    .attr("d", pathGenerator(map))
    .attr("fill", "lightgray");

    const states = g.append("g")
    .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(map, map.objects.states).features)
    .join("path")
    .attr("d", path)
    .attr("fill", "lightgray")
    //.on("click", clicked)
      .on('mouseover', function (event, d) {
        d3.select('#tooltip')
             // if you change opacity to hide it, you should also change opacity here
            .style("display", 'block') // Make the tooltip visible
            .html( // Change the html content of the <div> directly
            `<strong>${d.properties.state_info.state}</strong><br/>`)
            .style("left", (event.pageX + 20) + "px")
            .style("top", (event.pageY - 28) + "px");
        d3.select(this) // Refers to the hovered circle
            .style('stroke', 'black')
            .style('stroke-width', '4px')
        })
        .on("mouseout", function (event, d) {
            d3.select('#tooltip')
            .style('display', 'none') // Hide tooltip when cursor leaves
            d3.select(this) // Refers to the hovered circle
            .style('stroke', 'black')
            .style('stroke-width', '0px')
    });

  /*const states = g.append("g")
    .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(map, map.objects.states).features)
    //.data(map.features)
    .join("path")
    .attr("d", path)
    .on('mouseover', function (event, d) {
        d3.select('#tooltip')
             // if you change opacity to hide it, you should also change opacity here
            .style("display", 'block') // Make the tooltip visible
            .html( // Change the html content of the <div> directly
            `<strong>${d.properties.state_info.state}</strong><br/>%`)
            .style("left", (event.pageX + 20) + "px")
            .style("top", (event.pageY - 28) + "px");
        d3.select(this) // Refers to the hovered circle
            .style('stroke', 'black')
            .style('stroke-width', '4px')
        });*/

    states.append("title")
    .text(d => d.properties.name);

    g.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path(topojson.mesh(map, map.objects.states, (a, b) => a !== b)));
        //.attr("d", path(topojson.mesh(map, map.features, (a, b) => a !== b)));

//    const g = svg.append("g");

//    let counties_topo = topojson.feature(ca, ca.objects);
//   console.log(counties_topo);

//   const counties = g.append("g")
//     .attr("cursor", "pointer")
//     .selectAll("path")
//     .data(topojson.feature(ca, ca.features).features)
//     .join("path")
//     .attr("d", path)

//     g.append("path")
//     .attr("fill", "none")
//     .attr("stroke", "white")
//     .attr("stroke-linejoin", "round")
//     .attr("d", path(topojson.mesh(ca, ca.features, (a, b) => a !== b)));

    svg.selectAll('.points')
        .data(data)
        .join(
            function(enter) {
                return enter
                .append('circle')
                .attr('class', 'points')
                .attr('transform', ({longitude, latitude}) => `translate(${projection([longitude, latitude]).join(",")})`)
                .attr('r', d => d.total_stops/1000000*100)
                .style('fill-opacity', d => d.hit_disp*4)
                .style('fill', d => colorScale[race.indexOf(d.disp)])
                .style("stroke", d => colorScale[race.indexOf(d.disp)])
                .style("stroke-opacity", 1)
                .style("stroke-width", 1)
                .on('mouseover', function (event, d) {
                    // console.log(d) // See the data point in the console for debugging
                    d3.select('#tooltip')
                         // if you change opacity to hide it, you should also change opacity here
                        .style("display", 'block') // Make the tooltip visible
                        .html( // Change the html content of the <div> directly
                        `<strong>${d.city}</strong><br/>`)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    d3.select(this) // Refers to the hovered circle
                        .style('fill-opacity', 1)
                })
                .on("mouseout", function (event, d) {
                    d3.select('#tooltip')
                      .style('display', 'none') // Hide tooltip when cursor leaves
                    d3.select(this) // Refers to the hovered circle
                    .style('fill-opacity', d => d.hit_disp*4)
                    .style("stroke", d => colorScale[race.indexOf(d.disp)])
                    .style("stroke-opacity", 1)
                    .style("stroke-width", 1)
                })
            ;}
        );

    /*function(enter){ 
            return  enter
            .append('circle')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 5)
            .style('fill', d => d.color)
            // Important. All new circles should be associated with the point class
            .style('opacity', 0)
            .attr('class', 'point')
          },
            // We know we want to changes their coordinates
        function(update){ 
            return  update
            .transition()
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
        }, 
          // We know we want to remove an element if its associated data point is removed
        function(exit){ 
            return  exit
            .transition()
            .style('opacity', 0)
            .remove()
        }
    )
    .transition()
    //.attr('cx', d => xScale(d.x))
    //.attr('cy', d => yScale(d.y))
    .style('opacity', 1)*/

    d3.selectAll('.variable')
    // loop over each dropdown button
        .each(function() {
            d3.select(this).selectAll('myOptions')
            .data(options)
            .enter()
            .append('option')
            .text(d => d) // The displayed text
            .attr("value",d => d) // The actual value used in the code
        });

}

// Asynchronous initialization function
async function init() {
    try {
        let us = await d3.json("./data/states-albers-10m.json");
        //let ca = await d3.json("./data/California_Counties.geojson");
        let data = await d3.json("./data/ca.json");
        
        console.log('Map data:', us);
        //console.log('Map data:', ca);
        console.log('Stops data:', data);
        
        // Pass loaded data to visualization function
        createVis(us, data);
        //createVis(ca, data);
    } catch (error) {
        // Catch and report errors clearly
        console.error('Error loading data:', error);
    }
}

// Trigger data loading and visualization when the window loads
window.addEventListener('load', init);