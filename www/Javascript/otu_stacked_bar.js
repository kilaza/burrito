(function(){
  var otu_bar = {};

  var x = d3.scale.ordinal();
  var y = d3.scale.linear();

  var xAxis = d3.svg.axis()
  .orient("bottom");

  var yAxis = d3.svg.axis()
  .orient("left")
  .tickFormat(d3.format(".2s"));

  otu_bar.getSampleGroup = function(samp, sampledata, grouping){
    group = sampledata.filter(function(e){ return e.Sample==samp;})[0][grouping];
    return group;
  }


  function get_taxon_abundance(taxon, row, data_cube){
    var leaves = data_cube.get_leaves(taxon, data_cube.taxa_lookup);
    total = 0;
    for (var i = 0; i < leaves.length; i++){
      total += parseFloat(row[leaves[i]]);
    }
    return total;
  }

  otu_bar.make_data = function(otu_abundance_data, data_cube, sample_order){
    var bar_data = [];
    otu_abundance_data.forEach(function(d){
      var bar = {};
      bar.Sample = d.Sample;
      var y0 = 0;
      var my_display_taxa = data_cube.displayed_taxa.slice(0);
      my_display_taxa.reverse()
      bar.taxa = my_display_taxa.map(function(name){
        return { name: name, y0: y0, y1: y0 += get_taxon_abundance(name, d, data_cube)};
      });
      bar.total = bar.taxa[bar.taxa.length - 1].y1;
      bar_data.push(bar);
    })
    x.domain(sample_order);
    y.domain([0, 100]);
    return bar_data;
  }

  otu_bar.draw = function(bar_data, sampledata, colors, svglink, dims, highlight_overall, dehighlight_overall, sampleColor, sample_order, grouping, unclickEverything){

    d3.select("#otu_bar_y_label").remove()
    d3.select("#otu_bar_x_label").remove()
    d3.select("#otu_bar_xtick_svg").remove()

	var graphdims = {width: dims.width - 45, height: dims.height * 8/10, height_buffer:10, width_buffer:0, sample_buffer:45, x_axis_x_buffer:45, sample_label_buffer:8}
    x.rangeRoundBands([0, graphdims.width], .2);
    y.rangeRound([graphdims.height, 0]);
    xAxis.scale(x);
    yAxis.scale(y);
    
//     display_taxa = bar_data[0].taxa.map(function(d){
//     	return d.name;
//     }).sort(function(a,b){ return a.replace(/^[A-Za-z0-9]+_/,"") > b.replace(/^[A-Za-z0-9]+_/,""); })
	display_taxa = []
	d3.select("#Genomes").select(".part0").select("#saveLegBar0").select(".mainbars")
			.selectAll(".mainbar").each(function(d){
			display_taxa.push((d3.select(this).attr("id")).replace("Genomes0","")); })

    var tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("background", "lightyellow")
      .style("opacity", "1")
      .style("border", "0px")    
      .style("border-radius", "4px")  
      .style("padding","2px")
      .text("a simple tooltip");

    var normalized = true;

    bar_data.forEach(function(d) {
      d.taxa.forEach(function(e){
        e.y0 = Math.round(e.y0/d.total*100*100)/100;
        e.y1 = Math.round(e.y1/d.total*100*100)/100;
      })
    })

    var first_sample_x = x(sample_order[0]);
    var last_sample_x = x(sample_order[sample_order.length - 1]);

      //y-axis label
    svglink.append("text")
    .attr("class", "y label")
    .attr("id", "otu_bar_y_label")
    .attr("text-anchor", "middle")
    .attr("y", 0)
    .attr("x", -(graphdims.height + graphdims.height_buffer) / 2)
    .attr("font-size",18)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("Relative Abundance (%)");

  //x-axis label
    svglink.append("text")
    .attr("class", "x label")
    .attr("id", "otu_bar_x_label")
    .attr("text-anchor", "end")
    .attr("y", dims.height - 18)
    .attr("x", (dims.width - graphdims.width + graphdims.width_buffer) + ((graphdims.width  - graphdims.width_buffer)/ 2))
    .attr("font-size",18)
    .attr("font-style","bold")
    .attr("dy", ".75em")
    .text("Samples");


    var Sample = svglink.selectAll(".Sample")
      .data(bar_data)
      .enter().append("g")
      .attr("class", "g")
      .attr("transform", function(d) { 
        return "translate(" + (graphdims.sample_buffer - first_sample_x + x(d.Sample)) + "," + graphdims.height_buffer +")"; 
      });

    Sample.selectAll("rect")
      .data(function(d) {
      	d["taxa"] = d.taxa.map(function(dat){ 
      		dat_plusSamp = dat
      		dat_plusSamp["Sample"] = d.Sample
      		return dat_plusSamp; })
        return d.taxa;
      })
      .enter().append("rect")
      .attr("taxon", function(d){ return d.name; })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { 
        return y(d.y1); 
      })
      .attr("height", function(d) { 
        return y(d.y0) - y(d.y1) + 1; 
      })
      .style("fill", function(d) { 
        return colors(d.name); 
      })
      .style("opacity", 0.75)
      .on("mouseover", function(d){
      	current_rectangle_data = d3.select(this).datum();
  		clickedBars = d3.select("#Genomes").selectAll(".mainbars").select(".clicked")
  		clickedTaxaBars = d3.select("#Genomes").select(".part0").selectAll(".mainbars").select(".clicked")
  		clickedEdges = d3.select("#Genomes").selectAll(".edges").select(".clicked")
  		if(clickedBars.empty()){ //if nothing is clicked
        	highlight_overall(current_rectangle_data.name, "", 1);
        	name_split = (current_rectangle_data.name.split('_')).pop()
        	tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
        	return tooltip.style("visibility", "visible");
        }
        if(clickedTaxaBars.empty() == false){ // if any taxa are highlighted
    		if(display_taxa[clickedTaxaBars.datum().key] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
        	name_split = (current_rectangle_data.name.split('_')).pop()
        	tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
          	return tooltip.style("visibility", "visible");
    		}
    	} else if(clickedEdges.empty() == false){ //if an edge is clicked
    		if(display_taxa[clickedEdges.datum().key1] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){ //if relevant edge is clicked
    		    name_split = (current_rectangle_data.name.split('_')).pop()
        		tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
          		return tooltip.style("visibility", "visible");
    		}
    	}
      })
      .on("mousemove", function(d){ 
      	current_rectangle_data = d3.select(this).datum();
        clickedBars = d3.select("#Genomes").selectAll(".mainbars").select(".clicked")
  		clickedTaxaBars = d3.select("#Genomes").select(".part0").selectAll(".mainbars").select(".clicked")
  		clickedEdges = d3.select("#Genomes").selectAll(".edges").select(".clicked")
  		if(clickedBars.empty()){
	        return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
        } else if(clickedTaxaBars.empty() == false){
         	if(display_taxa[clickedTaxaBars.datum().key] == (d.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
         		return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
         	}
         } else if(clickedEdges.empty() == false){
         	if(display_taxa[clickedEdges.datum().key1] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
         		return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
         	}
         }
      })
      .on("mouseout", function(d){
      	current_rectangle_data = d3.select(this).datum();
	    clickedBars = d3.select("#Genomes").selectAll(".mainbars").select(".clicked")
  		clickedTaxaBars = d3.select("#Genomes").select(".part0").selectAll(".mainbars").select(".clicked")
  		clickedEdges = d3.select("#Genomes").selectAll(".edges").select(".clicked")
  		if(clickedBars.empty()){
        	var current_rectangle_data = d3.select(this).datum();
        	dehighlight_overall(current_rectangle_data.name, "", 1);
        	return tooltip.style("visibility", "hidden");
        }  
        if(clickedTaxaBars.empty() == false){
    		if(display_taxa[clickedTaxaBars.datum().key] == (d.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
	    		return tooltip.style("visibility", "hidden");
    		} 
    	} else if(clickedEdges.empty() == false){
    		if(display_taxa[clickedEdges.datum().key1] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
    			return tooltip.style("visibility", "hidden");
    		}
    	}
      })
      .on("click", function(d){
      	//need to de-highlight everything first
        current_rectangle_data = d3.select(this).datum();
        current_id = "Genomes0"+current_rectangle_data.name.replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")
      	clickedBars = d3.select("#Genomes").selectAll(".mainbars").select(".clicked")
  		clickedTaxaBars = d3.select("#Genomes").select(".part0").selectAll(".mainbars").select(".clicked")
  		clickedEdges = d3.select("#Genomes").selectAll(".edges").select(".clicked")
  		
		//Unselect things currently clicked
		//unclickEverything(current_id) //unclick everything except specified ID

		if(d3.select("#"+current_id).classed("clicked")){ //if clicked already
			d3.select("#"+current_id).classed("highlighted",false)
			d3.select("#"+current_id).classed("clicked",false)
			dehighlight_overall(current_rectangle_data.name, "",1)
		} else{
			d3.select("#"+current_id).classed("highlighted",true)
			d3.select("#"+current_id).classed("clicked",true)
			highlight_overall(current_rectangle_data.name, "", 1);
		}
		return tooltip.style("visibility", "hidden")
						
					
//   		if(clickedBars.empty()){ //if nothing is clicked
        	
//         	name_split = (current_rectangle_data.name.split('_')).pop()
//         	tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
//         	return tooltip.style("visibility", "visible");
//         }
//         if(clickedTaxaBars.empty() == false){ // if any taxa are highlighted
//     		if(display_taxa[clickedTaxaBars.datum().key] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){
//         	name_split = (current_rectangle_data.name.split('_')).pop()
//         	tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
//           	return tooltip.style("visibility", "visible");
//     		}
//     	} else if(clickedEdges.empty() == false){ //if an edge is clicked
//     		if(display_taxa[clickedEdges.datum().key1] == (current_rectangle_data.name).replace(/ /g,"_").replace(/(,|\(|\)|\[|\])/g, "_")){ //if relevant edge is clicked
//     		    name_split = (current_rectangle_data.name.split('_')).pop()
//         		tooltip.html("<strong>Taxon</strong>: " + name_split + "<br>" + "<strong>Sample: </strong>"+current_rectangle_data.Sample + " <br>"+ "<strong>Relative Abundance: </strong>" +Math.round((current_rectangle_data.y1-current_rectangle_data.y0)*100)/100+"%");
//           		return tooltip.style("visibility", "visible");
//     		}
//     	}

      });

    svglink.append("svg")
    .attr("id", "otu_bar_xtick_svg")
    .attr("x", 0)
    .attr("y",graphdims.height + graphdims.height_buffer)
    .attr("width", last_sample_x - first_sample_x + graphdims.x_axis_x_buffer + x.rangeBand())
    .attr("height", dims.height-25 - graphdims.height - graphdims.height_buffer)
    .style("font-family", "Verdana");

      d3.select("#otu_bar_xtick_svg").append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + graphdims.x_axis_x_buffer + ",0)")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("transform", function(d) {
        return "translate(-" + (first_sample_x + (x.rangeBand()/2)) + "," + graphdims.sample_label_buffer + ") rotate(-90)"
      });

    svglink.append("g")
      .attr("class", "y axis")
	  .attr("transform","translate("+ (dims.width-graphdims.width + graphdims.width_buffer) +"," + graphdims.height_buffer + ")")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .attr("class", "y_label"); 

    svglink.selectAll("text").style("fill",function(m){
      if(sampledata.map(function(e){ return e.Sample; }).indexOf(m)!==-1 & grouping != ""){
        return sampleColor(otu_bar.getSampleGroup(m, sampledata, grouping));        
      } else {
        return "#000000";
      }
    });


    // var normalizebox = svg.append("foreignObject")
    //   .attr("width", 100)
    //   .attr("height", 100)
    //   .attr("x", width + 50)
    //   .attr("y", height/2)
    //   .attr("text", "Raw Repo Counts")
    //   .html("<form><input type=checkbox><span>Raw Counts</span></form>")
    //   .on("click", function(){
    //     if (!normalized) {
    //       y.domain([0, 100]);
    //       d3.select(".y_label").text("Relative abundance");
    //       bar_data.forEach(function(d) {
    //         d.taxa.forEach(function(e){
    //           e.y0 = Math.round(e.y0/d.total*100*100)/100;
    //           e.y1 = Math.round(e.y1/d.total*100*100)/100;
    //         })
    //       })
    //     } else {
    //       y.domain([0, d3.max(bar_data, function(d) { 
    //         return d.total; 
    //       })]);
    //       d3.select(".y_label").text("Count");
    //       bar_data.forEach(function(d) {
    //         d.taxa.forEach(function(e){
    //           e.y0 = e.y0*d.total/100;
    //           e.y1 = e.y1*d.total/100;
    //         })
    //       })
    //     }

    //     normalized = !normalized;
    //     var transition = svg.transition().duration(750);

    //     transition.select('.y.axis')
    //       .call(yAxis);

    //     svg.selectAll(".Sample").data(bar_data);

    //     Sample.selectAll("rect")
    //       .data(function(d) { 
    //         return d.taxa; 
    //       })
    //       .transition().duration(750)
    //       .attr("width", x.rangeBand())
    //       .attr("y", function(d) { 
    //         return y(d.y1); 
    //       })
    //       .attr("height", function(d) { 
    //         return y(d.y0) - y(d.y1); 
    //       })
    //       .style("fill", function(d) { 
    //         return colors(d.name); 
    //       });
    //   });

    // normalizebox.append("div")
    //   .style("position", "absolute")
    //   .style("z-index", "10")
    //   .text("Raw Counts");
  };

otu_bar.select_bars = function(taxon){
 selected =  d3.select("#taxa_bars")
    .selectAll(".g")
    .selectAll("rect")
    .filter(function(d) {
      return d.name == taxon;
    });
	var trimstr = taxon.replace(/\W+/g,'') + "_tx";
	current_color = selected.style("fill");

	if (d3.select("#" + trimstr)[0][0] == null) {
  		var t = textures.lines()
    			.thicker()
    			.background(d3.rgb(current_color).brighter(0.2))
				.id(trimstr)
    			.stroke("white");

  		d3.select("#patternsvg").call(t);
	}

    selected.style("opacity", 1)
        .style("fill", "url(#" + trimstr + ")");

}

otu_bar.deselect_bars = function(taxon, colors){
  d3.select("#taxa_bars")
    .selectAll(".g")
    .selectAll("rect")
    .filter(function(d) {
      return d.name == taxon;
    })
    .style("opacity", 0.75)
    .style("fill", function(d){ return colors(d.name); });
}

  this.otu_bar = otu_bar;
})();


/*    var legend = svg.selectAll(".legend")
        .data(color.domain().slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(150," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });

    legend.append("foreignObject")
        .attr("x", width-5)
        .attr("width", 100)
        .attr("height", 20)
        .append("xhtml:body")
        .html("<input type=radio name='sort_by'/>")
        .on("click", function (sort_cat) {
          if(normalized) {
              var x0 = x.domain(data.sort(function(a, b) { return a[sort_cat]/a.total - b[sort_cat]/b.total; }).map(function(d){ return d['Sample']; })).copy();
          } else {
            var x0 = x.domain(data.sort(function(a, b) { return a[sort_cat] - b[sort_cat]; }).map(function(d){ return d['Sample']; })).copy();
          }
          var transition = svg.transition().duration(750);

          Sample.transition().duration(750).attr("transform", function(d) { return "translate(" + x0(d.Sample) + ",0)"; });

          transition.select('.x.axis')
            .call(xAxis);
        });
*/

