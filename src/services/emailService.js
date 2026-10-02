import emailjs from "@emailjs/browser"

export const EMAILJS_CONFIG = {
  serviceId: "service_8fcpf9y",
  templateId: "template_0fknrqk",
  publicKey: "SxWYXftNJlGD3sR5S",
}

/**
 * Universal sender for all website form submissions.
 * Includes multiple parameter aliases (e.g. name / from_name, email / from_email)
 * to ensure compatibility with whichever variables are configured in the EmailJS dashboard template.
 */
export const sendWebsiteForm = async ({
  formType = "Website Submission",
  fromName = "Website Visitor",
  fromEmail = "no-reply@blisschool.ng",
  phone = "N/A",
  subject = "Website Inquiry",
  grade = "N/A",
  entryTerm = "N/A",
  message = "No additional message provided.",
}) => {
  try {
    const timestamp = new Date().toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Africa/Lagos",
    })

    const templateParams = {
      // Form identification
      form_type: formType,
      formType: formType,

      // Sender identification aliases
      from_name: fromName,
      name: fromName,
      user_name: fromName,

      from_email: fromEmail,
      email: fromEmail,
      user_email: fromEmail,
      reply_to: fromEmail,

      // Phone / contact aliases
      phone: phone,
      contact_number: phone,
      phoneNumber: phone,

      // Subject / Grade / Academic level
      subject: subject,
      grade: grade,
      class_level: grade,
      entry_term: entryTerm,
      entryTerm: entryTerm,

      // Message body
      message: message,

      // Timestamp
      timestamp: timestamp,
      date: timestamp,
    }

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    )

    return { success: true, result }
  } catch (error) {
    console.error("EmailJS submission failure:", error)
    return { success: false, error }
  }
}

export default sendWebsiteForm
