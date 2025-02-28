export async function Endpoint_notfound(_req,res) {
    try {
        res.status(400).json({
            message : "You have hitted a wrong url path"
        })
    } catch (error) {
        console.log(error.message);
        res.status(400).json({
            message : error.message
        })
    }
}