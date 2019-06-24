//Headless web browser
var Nightmare = require('nightmare');
nightmare = Nightmare({ show: true });
//Pretty much core jQuery for the server
const cheerio = require('cheerio');
//Library for formatting strings with HTML tags
var striptags = require('striptags');
var i = 0;
// Book category amazon link
const url = 'https://www.amazon.com/gp/browse.html?node=283155&ref_=nav_em_T1_0_4_26_1__bo_t3';

// Headless browser to scrape data
nightmare
  //Send browser to amazon category page
  .goto(url)
  .wait('body')
  .wait(2000)
  //Click on amazon free shipping to filter only physical books
  .check('#leftNav > ul:nth-child(21) > div > li > span > span > div > label > input[type=checkbox]')
  .wait('body')
  .wait(5000)
  //Get page html
  .evaluate(() => document.querySelector('body').innerHTML)
  //Close headless browser
  .end()
  //Process html data
  .then(html => {
	  data = [];
	  //Load html data into cheerio(
	  const $ = cheerio.load(html);
	  //Array for all product page links
	  let links = [];
	  
	  //Select all product cards on page 1
	  $('#search > div.sg-row > div.sg-col-20-of-24.sg-col-28-of-32.sg-col-16-of-20.sg-col.s-right-column.sg-col-32-of-36.sg-col-8-of-12.sg-col-12-of-16.sg-col-24-of-28 > div > span:nth-child(4) > div.s-result-list.s-search-results.sg-row > div > div > div > div > div:nth-child(2)').each((row, raw_element) => {
		  //Create book object for each product card
		  let book = new Book(i++);
		  let selectors = new ProductSelectors();
		  let link;
		  //Checks all properties of the book object for the select statements
		  for(var key in selectors) {
			  //Name selector
			  if(key == 'nameSelect') {
				  book.name = $(raw_element).find(selectors[key]).text();
			  //Source URL selector
			  } else if (key == 'sourceSelect') {
				  link = 'https://www.amazon.com' + $(raw_element).find(selectors[key]).attr('href');
				  book.sourceURL = link;
				  links.push(link);
			  //Price selector removes $ so the string only contains the value
			  } else if (key == 'priceSelect') {
				  book.listPrice = $(raw_element).find(selectors[key]).text().substring($(raw_element).find(selectors[key]).text().indexOf('$')+1);
			  }
		  }
		  //Adds current book data to data array
		  data.push(book);
	  });  
	  /*Iterating through the links array using reduce allows the scraper
	  open a new nightmare tab in series instead of asynchronously. This 
	  lowers CPU requirements by not opening 20 headless browsers at once*/ 
	  links.reduce(function(accumulator, link) {
		  return accumulator.then(function(results) {
			  //Gets previous book data
			  let book = data[links.indexOf(link)];
			  //Creates nightmare instance for specific product page
			  const nightmare2 = Nightmare();
			  return nightmare2.goto(link)
			    .wait('body')
			    .wait(1000)
			    //Opens product images popup
			    .click('#imgThumbs > span > span')
			    .wait('#igImage')
			    //Gets page html (including header popup)
			    .evaluate(() => document.querySelector('body').innerHTML)
			    .end()
			    //Processes page specific product information
			    .then(response => {
			    	//Load html data into cheerio
			    	let $ = cheerio.load(response);
			    	//Image url array
			    	let imgUrls = []; 
			
					//Loop through all product thumbnails and takes the substring for the full res link
					$('#imgGalleryContent > div.a-column.a-span4.ig-thumbs.a-span-last > div > img').each((j, elem) => {
						let finalUrl = $(elem).attr('src').substring(0, $(elem).attr('src').indexOf('_')) + 'jpg';
						//push full resolution link into array
						imgUrls.push(finalUrl);
					});
					//and set the imageURLs book property
					book.imageURLs = imgUrls;
					
					//Get static product page info (dimensions, description, and weight)
					book = getProductPageData(response, book);
					//and sets the data onto the book object	
					
			    });
		  	});
		//When all product specific nightmare instances are finished return the data array in JSON
		}, Promise.resolve([])).then(function(results){
		    console.log(JSON.stringify(data));
		});
  }).catch(err => {
    console.log(err);
  });

//Function for collecting productPageData
let getProductPageData = (html, product) => {

	let $ = cheerio.load(html);
	let dimensions;
	let weight;
	let description;
	//Get product details list items
	$('#productDetailsTable > tbody > tr > td > div > ul > li').each((row, raw_element) => {
	  	//And select and format the correct data
		if($(raw_element).text().includes('Product Dimensions:')){
			dimensions = $(raw_element).text().substring($(raw_element).text().indexOf(':')+1).replace("\n", "").trim();
		} else if($(raw_element).text().includes('Shipping Weight:')) {
			weight = $(raw_element).text().substring($(raw_element).text().indexOf(':')+1, $(raw_element).text().indexOf('(')).trim();
		}			
	});
	//Select noscript element that contains the book description
	description = $('#bookDescription_feature_div > noscript').text();
	//and format the data to have no HTML entities
	description = striptags(decodeHTMLEntities(description)).trim();
	//set final product properties
	product.description = description;
	product.product_dimensions = dimensions;
	product.weight = weight;
	//if description is not null return updated product
	if (description) {
		return product;
	}
  
}	
//Default product class, all amazon products need an id, name, sourceURL and price
class Product {
	constructor(id) {
		this.id = id;
		this.name;
		this.sourceURL;
		this.listPrice;
	}
}
//Default product selectors, this allows these selectors to be kept in one place since they don't vary across category
class ProductSelectors {
	constructor(){
		this.nameSelect = 'div.sg-col-4-of-12.sg-col-8-of-16.sg-col-16-of-24.sg-col-12-of-20.sg-col-24-of-32.sg-col.sg-col-28-of-36.sg-col-20-of-28 > div > div:nth-child(1) > div > div > div:nth-child(1) > h2 > a > span';
		this.sourceSelect = 'div.sg-col-4-of-12.sg-col-8-of-16.sg-col-16-of-24.sg-col-12-of-20.sg-col-24-of-32.sg-col.sg-col-28-of-36.sg-col-20-of-28 > div > div:nth-child(1) > div > div > div:nth-child(1) > h2 > a';
		this.priceSelect = 'div.sg-col-4-of-12.sg-col-8-of-16.sg-col-16-of-24.sg-col-12-of-20.sg-col-24-of-32.sg-col.sg-col-28-of-36.sg-col-20-of-28 > div > div:nth-child(2) > div:nth-child(1) > div > div.a-section.a-spacing-none.a-spacing-top-small > div:nth-child(2) > div > a > span.a-price.a-text-price > span.a-offscreen';
	}
}
//Book class which takes the properties from the Product class and adds more specific properties to books
class Book extends Product {
	constructor(){
		super(); 
        this.product_dimensions;
        this.weight;
		this.description;
		this.imageURLs;
	}
}
//Replaces HTML entities from text
function decodeHTMLEntities(text) {
	//An array of entities to replace
    var entities = [
        ['amp', '&'],
        ['apos', "'"],
        ['#x27', "'"],
        ['#x2F', '/'],
        ['#39', "'"],
        ['#47', '/'],
        ['lt', '<'],
        ['gt', '>'],
        ['nbsp', ' '],
        ['quot', '"'],
		['rsquo', "'"],
		['lsquo', "'"],
		['rdquo', '"'],
		['ldquo', '"'],
		['#160', ' '],
		['#8212', '—'],
		['#8211', '-'],
		['#8217', "'"],
		['mdash', '-'],
		['bull', '•']
    ];
    //Iterates through entities array and replaces the entities in the string with the appropriate character
    for (var i = 0, max = entities.length; i < max; ++i) 
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
    //Return formated text
    return text;
}
