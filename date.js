// a inbuilt module created to export its function/variable to another file by requiring it


const getsDate =  function ()   
{
    const d = new Date  // Date is a javascript object  which has number of properties & method

    const options = {
        weekday: "long",
        month: "long",
        day: "numeric"
    }
    return d.toLocaleDateString("en-US", options)
     
}


const getsDay= function()
{
    const d = new Date  // Date is a javascript object  which has number of properties & method

    const options = {
        weekday: "long",
      
    }
    return d.toLocaleDateString("en-US", options)
     
}


export { getsDate, getsDay };