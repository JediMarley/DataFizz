# Crawling with Marley Schiesz

## Purpose

This application scrapes amazon product data, specifically books and returns a JSON array of book objects to a file.

## Nightmare.js

I decided to use the nightmare library to load any javascript on the page and provide a solution to navigating the webpages. The steps this app goes through with nightmare are as follows...
1. Go to books category of amazon
2. Wait for the page to load to avoid amazon checking if the browser is a bot
3. Click the amazon free shipping checkbox to filter out digital books
4. Get the page HTML and close the browser
5. Process HTML by selecting each product using Cheerio and collect name, pageUrl and price
6. For each product open a new nightmare instance that goes to the products pagee
7. Wait for the page to load to avoid amazon checking if the browser is a bot
8. Click the thumbnail popup opener to show the product thumbnails
9. Get the page HTML and close the browser
10. Process HTML by getting product page specific information (description, productImageURLS, dimensions and weight)

## Cheerio.js

Cheerio was also used which provided an easy to use syntax for selecting html elements and getting their information

## Striptags.js

Striptags was used to clean up the description of products which was flooded with html tags, I also created my own function since striptags was a little limited

## fs.js

This library was just used to allow the final JSON data to be saved to a file