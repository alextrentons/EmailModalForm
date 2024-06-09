import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import logo from '../../img/logo.png';
import { Button, buttonTypes } from '../../UI/Button/Button';
import { AddFiles, AddFilesList } from '../../UI/AddFiles/AddFiles';
import { setAlert } from '../../actions/alert';
import { formGridRow, getCSVfile } from '../../utils/global.services';
import { getColor } from '../../utils/constants';
import { sendEmail } from '../../actions/user';
import {
  getVendorOptimizationRequest,
  getVendorOptimizationRequestText
} from '../../utils/emailTemplates';
import { Input } from '../../UI/Input/Input';
import { headers, filesLimit, fileTypes } from './EmailModalForm.data';
import { isValidEmail } from './EmailModalForm.service';
import classes from './EmailModalForm.module.css';
import NotificationModal from '../NotificationModal/NotificationModal';
import { TextEditor } from '../../UI/TextEditor/TextEditor';
import { MdOutlineMail } from 'react-icons/md';
import { ModalContainer } from '../../UI/ModalContainer/ModalContainer';
import { routes } from '../../providers/AppRoutes/AppRoutes.data';

const EmailModalForm = ({
  auth: { user, emailLoading },
  isOpen,
  setIsOpen,
  setAlert,
  lqsItems,
  emailRecipients,
  sendEmail,
  setSelectedRows
}) => {
  const [files, setAttachments] = useState([]);
  const [textEditorValue, setTextEditorValue] = useState(null);
  const [textIsValid, setTextIsValid] = useState('');
  const [textareaValues, setTextareaValues] = useState({});
  const [cc, setCc] = useState('');
  const [editingCc, setEditingCc] = useState(false);
  const [validation, setValidation] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const modifiedItems = useMemo(() => {
    return lqsItems.map((item) => {
      return {
        ...item,
        details: textareaValues[item.asin]
      };
    });
  }, [lqsItems, textareaValues]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSend = async () => {
    let showError = false;
    const isValid = isValidEmail(cc);
    if (cc && !isValid) {
      setValidation('Invalid email address');
      showError = true;
    }
    if (!textEditorValue && !lqsItems.length) {
      setTextIsValid('required');
      showError = true;
    }

    if (showError) {
      setAlert('Please fill out all required fields.', 'error');
      return;
    }

    const body = lqsItems.length
      ? getVendorOptimizationRequest({
          email: user.email,
          cc,
          headers,
          items: modifiedItems
        })
      : getVendorOptimizationRequestText({
          email: user.email,
          cc,
          text: textEditorValue
        });
    //create csv file
    const csvFile =
      modifiedItems.length > 100
        ? getCSVfile({
            headers,
            data: modifiedItems,
            fileName: 'lqs_items_list'
          })
        : null;

    const mailData = {
      subject: `Listing optimization request from Vendor ${user.email}`,
      email: emailRecipients,
      body: body
    };
    if (cc) mailData.cc = cc;
    if (files.length) mailData.files = [...files];
    if (csvFile) {
      if (files.length) {
        mailData.files.unshift(csvFile);
      } else {
        mailData.files = [csvFile];
      }
    }

    const res = await sendEmail({ data: mailData, hideAlert: true });

    if (res) {
      setEmailSent(true);
      setSelectedRows([]);
      setCc('');
      setTimeout(() => {
        setEmailSent(false);
        handleClose();
      }, 3000);
    }
  };

  const changeDescription = (e) => {
    if (textIsValid && e.target.innerHTML) {
      setTextIsValid('');
    }
    setTextEditorValue(e.target.innerHTML);
  };

  const handleTextareaChange = (e, asin) => {
    const value = e.target.value;
    setTextareaValues((prevValues) => ({
      ...prevValues,
      [asin]: value
    }));
  };

  const handleCcChange = (event) => {
    if (validation) setValidation('');
    setCc(event.target.value);
  };

  const handleAddCcClick = () => {
    setEditingCc(true);
  };

  return !emailSent ? (
    <ModalContainer
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      headerClass={classes.emailModalHeader}
      header={
        <>
          <div className={classes.logoContainer}>
            <img src={logo} alt="Logo" />
          </div>
          <div className={classes.verticalLine} />
          <p className={classes.emailModalTitle}>Vendor Portal</p>
        </>
      }
      containerClass={classes.emailModal}
      bodyClass={classes.emailModalBody}
    >
      <h2 className={classes.emailHeader}>
        <div className={classes.emailIcon}>
          <MdOutlineMail />
        </div>
        <span className={classes.headerText}>Email</span>
      </h2>
      <div className={`${classes.emailIframe}`}>
        <div className={classes.contactInfo}>
          <h3 className={classes.contactInfoHeader}>To:</h3>
          <p className={classes.contactInfoText}>WebyCorp</p>
        </div>
        <div
          className={`${classes.contactInfo} ${classes.contactInfoCc}`}
          style={{ minHeight: '45px' }}
        >
          <h3
            className={`${classes.contactInfoHeader} ${classes.contactInfoHeaderCc}`}
          >
            Cc:
          </h3>
          {editingCc ? (
            <div>
              <Input
                inputType={classes.inputCC}
                value={cc}
                onChange={handleCcChange}
                placeholder={'Separate email addresses with commas'}
                error={validation}
              />
            </div>
          ) : (
            <button
              className={`${classes.addCcButton} ${classes.contactInfoHeaderCc}`}
              onClick={handleAddCcClick}
            >
              <p className={classes.contactInfoText}>Add CC</p>
            </button>
          )}
        </div>
        <div className={classes.contactInfo}>
          <h3 className={classes.contactInfoHeader}>From:</h3>
          <p className={classes.contactInfoText}>{user.email}</p>
        </div>

        {lqsItems.length ? (
          <div>
            <span className={classes.helpText}>
              Please provide any detailed request if necessary
            </span>
            <div className={classes.itemsBox}>
              <div className="table-container">
                <div id="lqs-byitem-table" className="table-box">
                  <div
                    style={{
                      gridTemplateColumns: formGridRow(headers)
                    }}
                    className="standard-table-header"
                  >
                    {headers.map((h, i) => (
                      <div
                        key={`byitem-header-${i}`}
                        className="table-header-cell"
                      >
                        {h.label}
                      </div>
                    ))}
                  </div>
                  <div className={`standard-table-body ${classes.tableBody}`}>
                    {lqsItems.map((row, index) => (
                      <div
                        key={`byitem-row-${index}`}
                        style={{
                          color: getColor(row.lqs),
                          gridTemplateColumns: formGridRow(headers)
                        }}
                        className="standard-table-row"
                      >
                        {headers.map((h, j) => (
                          <div
                            key={`byitem-body-cell-${index}-${j}`}
                            className={`table-body-cell ${
                              h.key === 'details' ? classes.detailsCell : ''
                            }`}
                          >
                            {h.key === 'asin' ? (
                              <Link
                                style={{ color: getColor(row.lqs) }}
                                className="active-modal-cell"
                                to={routes.vendorItem?.replace(
                                  ':asin',
                                  row.asin
                                )}
                                target="_blank"
                              >
                                {row[h.key]}
                              </Link>
                            ) : h.key === 'details' ? (
                              <textarea
                                value={textareaValues[row.asin] || ''}
                                onChange={(e) =>
                                  handleTextareaChange(e, row.asin)
                                }
                                className={classes.detailsTextarea}
                              />
                            ) : (
                              row[h.key]
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <span className={classes.helpText}>
              Please provide any detailed request on the listings you would like
              us to optimize.
            </span>
            <TextEditor
              containerClassName={classes.emailModalTextContainer}
              onChange={changeDescription}
              setAlert={setAlert}
              error={textIsValid}
              hideFilesAdd
            />
          </>
        )}
        <div className={classes.addFilesContainer}>
          <AddFiles
            files={files}
            setAttachments={setAttachments}
            setAlert={setAlert}
            fileTypes={fileTypes}
            filesLimit={filesLimit}
            id="files"
            containerClassName={classes.attachedBtn}
          >
            <span className={classes.attachedBtnLabel}>+Add attachments</span>
          </AddFiles>
          <AddFilesList
            files={files}
            setAttachments={setAttachments}
            containerClassName={classes.emailAddFiles}
          />
        </div>
      </div>
      <div className={classes.emailModalFooter}>
        <Button
          buttonType={`${buttonTypes.USER} ${classes.cancelButton}`}
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          buttonType={`${buttonTypes.USER} ${classes.sendButton}`}
          onClick={handleSend}
          disabled={emailLoading}
          loading={emailLoading}
        >
          Send
        </Button>
      </div>
    </ModalContainer>
  ) : (
    <NotificationModal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      header="Thank you for contacting WebyCorp!"
      text="Your request for listing improvement has been successfully sent. We will follow up with you as soon as possible."
    />
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps, { setAlert, sendEmail })(
  EmailModalForm
);
